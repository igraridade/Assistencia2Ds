from flask import Blueprint, request, render_template, redirect, url_for, session, flash, jsonify, make_response
from mysql.connector import errors as mysql_errors
import logging
import csv
from io import StringIO
from datetime import date, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

from app import (
    fetch_one, fetch_all, exec_write, _count, is_admin, cache,
    get_conn, _count_by_date_until, _count_alocacoes_no_dia_safe,
    growth_str, _series_by_day, _series_alocacoes_by_day,
    DATA_COLS, logger, resumo_crescimento
)

bp = Blueprint('pagina', __name__)

@bp.route('/')
def home():
    try:
        total_servicos = _count("SELECT COUNT(*) c FROM servico")
        total_tecnicos = _count("SELECT COUNT(*) c FROM tecnico")
        total_empresas = _count("SELECT COUNT(*) c FROM empresa_cliente") if is_admin() else 0
        total_usuarios = _count("SELECT COUNT(*) c FROM usuario") if is_admin() else 0
        servicos = fetch_all("""
            SELECT s.protocolo, ec.nome nome_empresa, s.problema, s.prioridade, s.status, s.prazo_estimado
            FROM servico s
            JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            ORDER BY s.data_abertura DESC
            LIMIT 10
        """)
    except Exception as e:
        flash(f'Erro ao carregar dados.', 'danger')
        logger.exception("Erro na rota home")
        total_servicos = total_tecnicos = total_empresas = total_usuarios = 0
        servicos = []
    return render_template(
        'home.html',
        total_servicos=total_servicos,
        total_tecnicos=total_tecnicos,
        total_empresas=total_empresas,
        total_usuarios=total_usuarios,
        servicos=servicos,
        user_name=session.get('usuario_nome'),
        admin=is_admin()
    )

@bp.route('/servicos')
def servicos():
    # ✅ Redireciona usuários comuns para "Meus Serviços"
    if not is_admin():
        return redirect(url_for('pagina.meus_servicos'))

    # Código para admin (continua igual)
    try:
        # Busca até 50 serviços para o admin, ordenados por data de abertura
        servicos = fetch_all("""
            SELECT
                s.protocolo,
                ec.nome as nome_empresa,
                s.problema,
                s.prioridade,
                s.status,
                s.prazo_estimado,
                s.data_abertura
            FROM servico s
            JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            ORDER BY s.data_abertura DESC
            LIMIT 50
        """)
    except Exception as e:
        flash('Erro ao carregar serviços.', 'danger')
        logger.exception("Erro na rota /servicos")
        servicos = []

    return render_template(
        'servicos.html',
        servicos=servicos,
        user_name=session.get('usuario_nome'),
        admin=is_admin()
    )



@bp.route('/sobre-nos')
def sobre_nos():
    return render_template('sobre_nos.html')

@bp.route('/ajuda')
def ajuda():
    return render_template('ajuda.html')

@bp.route('/dashboard')
def dashboard():
    if not is_admin():
        flash('Acesso negado.', 'danger')
        return redirect(url_for('pagina.servicos'))
    try:
        tecnicos_now = _count("SELECT COUNT(*) c FROM tecnico")
        empresas_now = _count("SELECT COUNT(*) c FROM empresa_cliente")
        usuarios_now = _count("SELECT COUNT(*) c FROM usuario")
        hoje = date.today()
        ontem = hoje - timedelta(days=1)
        col_tecnico = DATA_COLS['tecnico']
        col_empresa = DATA_COLS['empresa_cliente']
        col_usuario = DATA_COLS['usuario']
        tecnicos_ontem = _count_by_date_until('tecnico', col_tecnico, ontem)
        empresas_ontem = _count_by_date_until('empresa_cliente', col_empresa, ontem)
        usuarios_ontem = _count_by_date_until('usuario', col_usuario, ontem)
        aloc_hoje = _count_alocacoes_no_dia_safe(hoje)
        aloc_ontem = _count_alocacoes_no_dia_safe(ontem)
        metrics = {
            'tecnicos': {'count': tecnicos_now, 'growth': growth_str(tecnicos_now, tecnicos_ontem)},
            'empresas': {'count': empresas_now, 'growth': growth_str(empresas_now, empresas_ontem)},
            'usuarios': {'count': usuarios_now, 'growth': growth_str(usuarios_now, usuarios_ontem)},
            'alocacoes': {'count': aloc_hoje, 'growth': growth_str(aloc_hoje, aloc_ontem)}
        }
        servicos = fetch_all("""
            SELECT s.protocolo, ec.nome nome_empresa, s.prioridade, s.status, s.prazo_estimado
            FROM servico s
            JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            WHERE s.status <> 'concluida'
            ORDER BY s.data_abertura DESC
            LIMIT 10
        """)
    except Exception as e:
        logger.exception("Erro no dashboard")
        flash('Erro ao carregar dashboard.', 'danger')
        metrics = {
            'tecnicos': {'count': 0, 'growth': '+0%'},
            'empresas': {'count': 0, 'growth': '+0%'},
            'usuarios': {'count': 0, 'growth': '+0%'},
            'alocacoes': {'count': 0, 'growth': '+0%'}
        }
        servicos = []
    return render_template('dashboard.html', nome=session.get('usuario_nome'), servicos=servicos, metrics=metrics)

@bp.route('/empresas')
def empresas():
    if not is_admin():
        flash('Acesso negado.', 'danger')
        return redirect(url_for('pagina.home'))
    return render_template('empresas.html')


@bp.route('/tecnicos')
def tecnicos():
    if not is_admin():
        flash('Acesso negado.', 'danger')
        return redirect(url_for('pagina.home'))
    return render_template('tecnicos.html')

@bp.route('/usuarios')
def usuarios():
    if not is_admin():
        flash('Acesso negado.', 'danger')
        return redirect(url_for('pagina.home'))
    try:
        search_query = request.args.get('q', '').strip()
        perfil_filter = request.args.get('perfil', '').strip()
        query = """
            SELECT
                id_usuario as id,
                nome,
                email,
                telefone,
                admin,
                id_empresa_cliente_fk,
                data_cadastro,
                CASE WHEN admin = 1 THEN 'admin' ELSE 'usuario' END as perfil,
                'ativo' as status,
                DATE_FORMAT(data_cadastro, '%d/%m/%Y às %H:%i') as ultimo_acesso
            FROM usuario
            WHERE 1=1
        """
        params = []
        if search_query:
            query += " AND (nome LIKE %s OR email LIKE %s)"
            search_param = f"%{search_query}%"
            params.extend([search_param, search_param])
        if perfil_filter == 'admin':
            query += " AND admin = 1"
        elif perfil_filter == 'usuario':
            query += " AND admin = 0"
        query += " ORDER BY data_cadastro DESC"
        usuarios_data = fetch_all(query, params if params else None)
        total_usuarios = len(usuarios_data)
        usuarios_ativos = total_usuarios
        usuarios_admin = sum(1 for u in usuarios_data if u['admin'] == 1)
        usuarios_normais = total_usuarios - usuarios_admin
        return render_template('usuarios.html',
                             usuarios=usuarios_data,
                             total_usuarios=total_usuarios,
                             usuarios_ativos=usuarios_ativos,
                             usuarios_admin=usuarios_admin,
                             usuarios_normais=usuarios_normais)
    except Exception as e:
        logger.exception("Erro na página usuários")
        flash('Erro ao carregar usuários.', 'danger')
        return render_template('usuarios.html',
                             usuarios=[],
                             total_usuarios=0,
                             usuarios_ativos=0,
                             usuarios_admin=0,
                             usuarios_normais=0)

@bp.route('/alocacoes')
def alocacoes():
    if not is_admin():
        flash('Acesso negado.', 'danger')
        return redirect(url_for('pagina.home'))
    return render_template('alocacoes.html')

@bp.route('/login', methods=['POST'])
def login():
    email = (request.form.get('email') or '').strip().lower()
    senha = request.form.get('senha') or ''
    if not email or not senha:
        flash('Preencha email e senha.', 'warning')
        return redirect(url_for('pagina.home'))
    try:
        usuario = fetch_one("SELECT id_usuario, nome, senha, admin FROM usuario WHERE email=%s", (email,))
        if not usuario or not check_password_hash(usuario['senha'], senha):
            flash('Email ou senha incorretos.', 'danger')
            return redirect(url_for('pagina.home'))
        session['usuario_id'] = usuario['id_usuario']
        session['usuario_nome'] = usuario['nome']
        session['admin'] = bool(usuario.get('admin', 0))
        flash('Login efetuado com sucesso!', 'success')
        if session['admin']:
            return redirect(url_for('pagina.dashboard'))
        else:
            return redirect(url_for('pagina.home'))
    except Exception as e:
        flash(f'Erro no servidor: {e}', 'danger')
        return redirect(url_for('pagina.home'))


@bp.route('/logout')
def logout():
    session.clear()
    cache.clear()
    flash('Logout realizado com sucesso.', 'info')
    return redirect(url_for('pagina.home'))


@bp.get('/api/dashboard')
def api_dashboard():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403
    try:
        periodo = request.args.get('periodo', 'hoje')
        hoje = date.today()
        if periodo == 'semana':
            dias = 7
        elif periodo == 'mes':
            dias = 30
        elif periodo == 'ano':
            dias = 365
        else:
            dias = 2
        inicio = hoje - timedelta(days=dias - 1)
        tecnicos_now = _count("SELECT COUNT(*) c FROM tecnico")
        empresas_now = _count("SELECT COUNT(*) c FROM empresa_cliente")
        usuarios_now = _count("SELECT COUNT(*) c FROM usuario")
        aloc_hoje = _count_alocacoes_no_dia_safe(hoje)
        col_tecnico = DATA_COLS['tecnico']
        col_empresa = DATA_COLS['empresa_cliente']
        col_usuario = DATA_COLS['usuario']
        tecnicos_before = _count_by_date_until('tecnico', col_tecnico, inicio)
        empresas_before = _count_by_date_until('empresa_cliente', col_empresa, inicio)
        usuarios_before = _count_by_date_until('usuario', col_usuario, inicio)
        aloc_before = _count_alocacoes_no_dia_safe(inicio)
        growth_tec = growth_str(tecnicos_now, tecnicos_before)
        growth_emp = growth_str(empresas_now, empresas_before)
        growth_usr = growth_str(usuarios_now, usuarios_before)
        growth_aloc = growth_str(aloc_hoje, aloc_before)
        insights = {
            "usuarios": resumo_crescimento("usuários", growth_usr, periodo),
            "tecnicos": resumo_crescimento("técnicos", growth_tec, periodo),
            "empresas": resumo_crescimento("empresas", growth_emp, periodo),
            "alocacoes": resumo_crescimento("alocações", growth_aloc, periodo)
        }
        payload = {
            "tecnicos": {"count": tecnicos_now, "growth": growth_tec, "series": _series_by_day('tecnico', col_tecnico, days=min(dias, 30))},
            "empresas": {"count": empresas_now, "growth": growth_emp, "series": _series_by_day('empresa_cliente', col_empresa, days=min(dias, 30))},
            "usuarios": {"count": usuarios_now, "growth": growth_usr, "series": _series_by_day('usuario', col_usuario, days=min(dias, 30))},
            "alocacoes": {"count": aloc_hoje, "growth": growth_aloc, "series": _series_alocacoes_by_day(days=min(dias, 30))},
            "insights": insights
        }
        return jsonify(payload), 200
    except Exception as e:
        logger.exception("Erro na API dashboard")
        return jsonify({"error": "internal_error", "detail": str(e)}), 500

@bp.route('/api/dashboard/exportar')
def api_dashboard_exportar():
    if not is_admin():
        return jsonify({"error": "forbidden"}), 403
    try:
        periodo = request.args.get('periodo', 'hoje')
        tecnicos_now = _count("SELECT COUNT(*) c FROM tecnico")
        empresas_now = _count("SELECT COUNT(*) c FROM empresa_cliente")
        usuarios_now = _count("SELECT COUNT(*) c FROM usuario")
        aloc_hoje_now = _count("SELECT COUNT(*) c FROM alocacao_tecnico")
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['Métrica', 'Quantidade'])
        writer.writerow(['Técnicos Ativos', tecnicos_now])
        writer.writerow(['Empresas Cadastradas', empresas_now])
        writer.writerow(['Usuários Totais', usuarios_now])
        writer.writerow(['Alocações Hoje', aloc_hoje_now])
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = f"attachment; filename=dashboard_{periodo}.csv"
        response.headers["Content-type"] = "text/csv; charset=utf-8"
        return response
    except Exception as e:
        logger.exception("Erro na exportação do dashboard")
        return jsonify({"error": str(e)}), 500

@bp.route('/contratar-servico')
def contratar_servico():
    return render_template('contratar_servico.html',
                         user_name=session.get('usuario_nome'),
                         user_id=session.get('usuario_id'),
                         admin=is_admin())

@bp.route('/api/tecnicos-por-servico/<categoria>', methods=['GET'])
def api_tecnicos_por_servico(categoria):
    try:
        tecnicos = fetch_all("""
            SELECT
                t.id_tecnico,
                t.nome,
                t.especialidade,
                t.nivel_experiencia,
                t.preco_hora,
                COUNT(DISTINCT aloc.id_alocacao_tecnico) AS total_servicos,
                COUNT(DISTINCT CASE WHEN s.status = 'concluida' THEN aloc.id_alocacao_tecnico END) AS servicos_concluidos,
                COUNT(DISTINCT av.id_avaliacao) AS total_avaliacoes,
                AVG(av.nota) AS media_nota
            FROM tecnico t
            LEFT JOIN alocacao_tecnico aloc ON aloc.id_tecnico_fk = t.id_tecnico
            LEFT JOIN servico s ON s.protocolo = aloc.protocolo_fk
            LEFT JOIN avaliacao av ON av.id_tecnico_fk = t.id_tecnico
            WHERE t.especialidade = %s AND t.status = 1
            GROUP BY t.id_tecnico, t.preco_hora
            ORDER BY servicos_concluidos DESC, total_servicos DESC
        """, (categoria,))

        tecnicos_com_preco = []

        for tec in tecnicos:
            servicos_concluidos = int(tec.get('servicos_concluidos', 0))
            total_servicos = int(tec.get('total_servicos', 0))
            preco_hora = float(tec.get('preco_hora', 100.00))
            total_avaliacoes = int(tec.get('total_avaliacoes', 0) or 0)

            # Se não tem avaliação, nota = 0.0
            if total_avaliacoes == 0 or tec.get('media_nota') is None:
                avaliacao = 0.0
            else:
                avaliacao = round(float(tec['media_nota']), 1)

            tecnicos_com_preco.append({
                'id_tecnico': tec['id_tecnico'],
                'nome': tec['nome'],
                'especialidade': tec['especialidade'],
                'nivel_experiencia': tec['nivel_experiencia'],
                'avaliacao': avaliacao,
                'total_servicos': total_servicos,
                'servicos_concluidos': servicos_concluidos,
                'preco_hora': preco_hora,
                'total_avaliacoes': total_avaliacoes
            })

        # Se quiser ainda ordenar por avaliação:
        tecnicos_com_preco.sort(key=lambda x: x['avaliacao'], reverse=True)

        return jsonify({'success': True, 'tecnicos': tecnicos_com_preco})
    except Exception as e:
        logger.exception("Erro ao buscar técnicos por serviço")
        return jsonify({'error': str(e)}), 500



@bp.route('/api/contratar-tecnico', methods=['POST'])
def api_contratar_tecnico():
    if 'usuario_id' not in session:
        return jsonify({'error': 'not_authenticated', 'message': 'Você precisa estar logado'}), 401

    try:
        data = request.get_json()
        id_tecnico = data.get('id_tecnico')
        categoria = data.get('categoria')
        descricao = data.get('descricao', '').strip()
        prioridade = data.get('prioridade', 'media')
        endereco = data.get('endereco', '').strip()  # ✅ NOVO

        if not id_tecnico or not categoria or not descricao or not endereco:
            return jsonify({'error': 'Dados incompletos'}), 400

        user_id = session['usuario_id']
        usuario = fetch_one("SELECT id_empresa_cliente_fk FROM usuario WHERE id_usuario = %s", (user_id,))
        id_empresa = usuario.get('id_empresa_cliente_fk')

        if not id_empresa:
            return jsonify({'error': 'Usuário não vinculado a empresa'}), 400

        conn = get_conn()
        try:
            cursor = conn.cursor(dictionary=True)

            # ✅ SALVA COM ENDEREÇO
            cursor.execute("""
                INSERT INTO servico (id_empresa_cliente_fk, problema, categoria, prioridade,
                                   status, data_abertura, prazo_estimado, id_usuario_criador, endereco_atendimento)
                VALUES (%s, %s, %s, %s, 'aberta', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), %s, %s)
            """, (id_empresa, descricao, categoria, prioridade, user_id, endereco))
            conn.commit()

            protocolo = cursor.lastrowid
            if not protocolo:
                raise Exception('Erro ao gerar protocolo')

            cursor.execute("""
                INSERT INTO alocacao_tecnico (id_tecnico_fk, protocolo_fk, data_inicio_alocacao)
                VALUES (%s, %s, CURDATE())
            """, (id_tecnico, protocolo))
            conn.commit()

            cursor.execute("UPDATE servico SET status = 'em andamento' WHERE protocolo = %s", (protocolo,))
            conn.commit()

            cursor.close()
            conn.close()

        except Exception as dbex:
            conn.rollback()
            if cursor:
                cursor.close()
            conn.close()
            logger.exception("Erro na transação")
            return jsonify({'error': f'Erro no banco: {str(dbex)}'}), 500

        cache.clear()
        return jsonify({'success': True, 'protocolo': protocolo})

    except Exception as e:
        logger.exception("Erro ao contratar técnico")
        return jsonify({'error': str(e)}), 500


@bp.route('/meus-servicos')
def meus_servicos():
    if 'usuario_id' not in session:
        flash('Você precisa estar logado.', 'warning')
        return redirect(url_for('pagina.home'))

    try:
        user_id = session['usuario_id']

        servicos = fetch_all("""
            SELECT
                s.protocolo,
                s.problema,
                s.categoria,
                s.prioridade,
                s.status,
                s.data_abertura,
                s.prazo_estimado,
                s.endereco_atendimento,
                t.nome as nome_tecnico,
                t.nivel_experiencia,
                a.data_inicio_alocacao,
                a.data_fim_alocacao,
                av.nota as avaliacao_usuario,
                av.comentario as comentario_usuario
            FROM servico s
            LEFT JOIN alocacao_tecnico a ON s.protocolo = a.protocolo_fk
            LEFT JOIN tecnico t ON a.id_tecnico_fk = t.id_tecnico
            LEFT JOIN avaliacao av ON s.protocolo = av.protocolo_fk AND av.id_usuario_fk = %s
            WHERE s.id_usuario_criador = %s
            ORDER BY s.data_abertura DESC
        """, (user_id, user_id))

        total_servicos = len(servicos)
        em_andamento = sum(1 for s in servicos if s['status'] == 'em andamento')
        concluidos = sum(1 for s in servicos if s['status'] == 'concluida')
        abertos = sum(1 for s in servicos if s['status'] == 'aberta')

        return render_template('meus_servicos.html',
                             servicos=servicos,
                             total_servicos=total_servicos,
                             em_andamento=em_andamento,
                             concluidos=concluidos,
                             abertos=abertos,
                             user_name=session.get('usuario_nome'))

    except Exception as e:
        logger.exception("Erro ao carregar meus serviços")
        flash('Erro ao carregar seus serviços.', 'danger')
        return render_template('meus_servicos.html',
                             servicos=[],
                             total_servicos=0,
                             em_andamento=0,
                             concluidos=0,
                             abertos=0,
                             user_name=session.get('usuario_nome'))


@bp.route('/api/avaliar-servico', methods=['POST'])
def avaliar_servico():
    if 'usuario_id' not in session:
        return jsonify({'error': 'not_authenticated'}), 401

    try:
        data = request.get_json()
        protocolo = data.get('protocolo')
        nota = data.get('nota')
        comentario = data.get('comentario', '').strip()

        if not protocolo or nota is None:
            return jsonify({'error': 'Dados incompletos'}), 400

        nota = float(nota)
        if nota < 0.5 or nota > 5.0:
            return jsonify({'error': 'Nota deve estar entre 0.5 e 5.0'}), 400

        user_id = session['usuario_id']

        servico = fetch_one("""
            SELECT s.status, s.id_usuario_criador, a.id_tecnico_fk
            FROM servico s
            LEFT JOIN alocacao_tecnico a ON s.protocolo = a.protocolo_fk
            WHERE s.protocolo = %s
        """, (protocolo,))

        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404

        if servico['id_usuario_criador'] != user_id:
            return jsonify({'error': 'Você não pode avaliar este serviço'}), 403

        if servico['status'] != 'concluida':
            return jsonify({'error': 'Só é possível avaliar serviços concluídos'}), 400

        id_tecnico = servico['id_tecnico_fk']
        if not id_tecnico:
            return jsonify({'error': 'Nenhum técnico alocado'}), 400

        avaliacao_existe = fetch_one("""
            SELECT id_avaliacao FROM avaliacao
            WHERE protocolo_fk = %s AND id_usuario_fk = %s
        """, (protocolo, user_id))

        if avaliacao_existe:
            exec_write("""
                UPDATE avaliacao
                SET nota = %s, comentario = %s, data_avaliacao = NOW()
                WHERE protocolo_fk = %s AND id_usuario_fk = %s
            """, (nota, comentario, protocolo, user_id))
        else:
            exec_write("""
                INSERT INTO avaliacao (id_tecnico_fk, protocolo_fk, id_usuario_fk, nota, comentario)
                VALUES (%s, %s, %s, %s, %s)
            """, (id_tecnico, protocolo, user_id, nota, comentario))

        cache.clear()
        return jsonify({'success': True, 'message': 'Avaliação registrada!'})

    except Exception as e:
        logger.exception("Erro ao avaliar")
        return jsonify({'error': str(e)}), 500



