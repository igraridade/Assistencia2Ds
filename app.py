from flask import Flask, g, session, url_for as flask_url_for
from flask_cors import CORS
from flask_caching import Cache
from flask_compress import Compress
import logging
import time
from mysql.connector import pooling, errors as mysql_errors
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date, timedelta

# ========== CONFIGURAÇÃO DO APP ==========
app = Flask(__name__)
CORS(app)
Compress(app)
app.secret_key = 'um_valor_bem_secreto_e_unico_aqui_2025'
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300
cache = Cache(app)

# ========== CONTEXT PROCESSOR PARA CORRIGIR URL_FOR ==========
@app.context_processor
def utility_processor():
    """
    Adiciona automaticamente o prefixo 'pagina.' aos endpoints nos templates.
    Isso permite usar url_for('home') em vez de url_for('pagina.home').
    """
    def custom_url_for(endpoint, **values):
        # Lista de prefixos de blueprints que você tem
        blueprint_prefixes = ['tecnico', 'usuario', 'servico', 'empresa', 'alocacao']

        # Se o endpoint não tem ponto (.) e não é 'static'
        if '.' not in endpoint and endpoint != 'static':
            # Adiciona 'pagina.' automaticamente
            endpoint = f'pagina.{endpoint}'

        return flask_url_for(endpoint, **values)

    # Substitui url_for nos templates
    return dict(url_for=custom_url_for)

# ========== BANCO DE DADOS ==========
db_pool = pooling.MySQLConnectionPool(
    host='IGECHTECH.mysql.pythonanywhere-services.com',
    user='IGECHTECH',
    password='IGECH123#',
    database='IGECHTECH$Assistencia',
    pool_name='my_pool',
    pool_size=5,
    pool_reset_session=True
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("igech")

# ========== FUNÇÕES AUXILIARES ==========
def get_conn(retries=3, delay=0.3):
    for i in range(retries):
        try:
            return db_pool.get_connection()
        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1226 and i < retries - 1:
                time.sleep(delay)
                continue
            raise

def get_db_connection():
    if 'db_conn' not in g:
        g.db_conn = get_conn()
    return g.db_conn

@app.teardown_appcontext
def close_connection(exception):
    db_conn = g.pop('db_conn', None)
    if db_conn is not None:
        db_conn.close()

def fetch_one(query, params=None):
    conn = None
    cur = None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(query, params or ())
        return cur.fetchone()
    finally:
        try:
            if cur: cur.close()
        finally:
            if conn: conn.close()

def fetch_all(query, params=None):
    conn = None
    cur = None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(query, params or ())
        return cur.fetchall()
    finally:
        try:
            if cur: cur.close()
        finally:
            if conn: conn.close()

def exec_write(query, params=None):
    conn = None
    cur = None
    try:
        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(query, params or ())
        conn.commit()
        return cur.rowcount
    finally:
        try:
            if cur: cur.close()
        finally:
            if conn: conn.close()

def _count(sql, params=None):
    row = fetch_one(sql, params or ())
    return int(row['c']) if row and 'c' in row else 0

def is_admin():
    return bool(session.get('admin', False))

DATA_COLS = {
    'tecnico': 'data_cadastro',
    'empresa_cliente': 'data_cadastro',
    'usuario': 'data_cadastro',
    'alocacao_tecnico': 'data_inicio_alocacao'
}

def _count_by_date_until(table, date_col, d):
    try:
        sql = f"SELECT COUNT(*) c FROM {table} WHERE DATE({date_col}) <= %s"
        return _count(sql, (d,))
    except mysql_errors.ProgrammingError as e:
        if getattr(e, 'errno', None) == 1054:
            logger.warning("Coluna %s não existe na tabela %s; usando fallback sem filtro.", date_col, table)
            return _count(f"SELECT COUNT(*) c FROM {table}")
        raise

def _count_alocacoes_no_dia_safe(d):
    date_col = DATA_COLS.get('alocacao_tecnico', 'data_inicio_alocacao')
    try:
        sql = f"SELECT COUNT(*) c FROM alocacao_tecnico WHERE DATE({date_col})=%s"
        return _count(sql, (d,))
    except mysql_errors.ProgrammingError as e:
        if getattr(e, 'errno', None) == 1054:
            logger.warning("Coluna %s não existe; usando fallback sem filtro de data.", date_col)
            return _count("SELECT COUNT(*) c FROM alocacao_tecnico")
        raise

def growth_str(current, previous):
    if previous <= 0:
        return "+0%"
    pct = ((current - previous) / previous) * 100.0
    s = "+" if pct >= 0 else "-"
    return f"{s}{abs(int(round(pct)))}%"

def _series_by_day(table, date_col, days=7):
    today = date.today()
    start = today - timedelta(days=days-1)
    try:
        rows = fetch_all(
            f"SELECT DATE({date_col}) d, COUNT(*) c "
            f"FROM {table} "
            f"WHERE DATE({date_col}) BETWEEN %s AND %s "
            f"GROUP BY DATE({date_col}) ORDER BY d",
            (start, today)
        )
    except mysql_errors.ProgrammingError as e:
        if getattr(e, 'errno', None) == 1054:
            return [0]*days
        raise
    by_day = { r['d']: int(r['c']) for r in rows if r.get('d') is not None }
    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        series.append(by_day.get(d, 0))
    return series

def _series_alocacoes_by_day(days=7):
    date_col = DATA_COLS.get('alocacao_tecnico', 'data_inicio_alocacao')
    return _series_by_day('alocacao_tecnico', date_col, days)

def resumo_crescimento(label, growth, periodo):
    pct = int(growth.replace('%', '').replace('+','').replace('-',''))
    if '%' not in growth or growth == '+0%':
        return f"Neste(a) {periodo}, {label} não tiveram variação significativa."
    if growth.startswith('+'):
        return f"Neste(a) {periodo}, {label} cresceram {growth}."
    else:
        return f"Neste(a) {periodo}, {label} caíram {abs(pct)}%."

# ========== REGISTRO DE BLUEPRINTS ==========
from rotas_pagina import bp as pagina_bp
from rotas_tecnico import bp as tecnico_bp
from rotas_usuario import bp as usuario_bp
from rotas_servico import bp as servico_bp
from rotas_empresa import bp as empresa_bp
from rotas_alocacao import bp as alocacao_bp
from automacao_alocacao import automacao_bp
from automacao_servico import automacao_servico_bp


app.register_blueprint(pagina_bp)
app.register_blueprint(tecnico_bp)
app.register_blueprint(usuario_bp)
app.register_blueprint(servico_bp)
app.register_blueprint(empresa_bp)
app.register_blueprint(alocacao_bp)
app.register_blueprint(automacao_bp)
app.register_blueprint(automacao_servico_bp)


# ========== INICIALIZAÇÃO ==========
if __name__ == '__main__':
    app.run(debug=False)
