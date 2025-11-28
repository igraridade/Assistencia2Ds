from flask import Blueprint, request, jsonify, session
from mysql.connector import errors as mysql_errors
import logging
from datetime import date

from app import (
    fetch_one, fetch_all, exec_write, _count, cache, logger
)

bp = Blueprint('tecnico', __name__)

def status_to_text(status_bit):
    """Converte TINYINT(1) para texto: 1 = ativo, 0 = inativo"""
    return 'ativo' if status_bit == 1 else 'inativo'

def status_to_bit(status_text):
    """Converte texto para TINYINT(1): ativo = 1, inativo = 0"""
    if isinstance(status_text, str):
        return 1 if status_text.lower() == 'ativo' else 0
    return 1 if status_text else 0

@bp.get('/api/tecnicos')
@cache.cached(timeout=60)
def api_tecnicos():
    """Lista todos os técnicos cadastrados"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        rows = fetch_all("""
            SELECT
                t.id_tecnico,
                t.nome,
                t.email,
                t.telefone,
                t.especialidade,
                t.nivel_experiencia,
                t.preco_hora,
                t.status,
                t.data_cadastro,
                t.data_contratacao,
                ec.nome AS empresa,
                ec.id_empresa_cliente,
                (
                    SELECT COUNT(*) FROM alocacao_tecnico a
                    WHERE a.id_tecnico_fk = t.id_tecnico
                ) AS total_alocacoes
            FROM tecnico t
            LEFT JOIN empresa_cliente ec ON ec.id_empresa_cliente = t.id_empresa_cliente_fk
            ORDER BY t.nome
        """)
        tecnicos = []
        for r in rows:
            tecnicos.append({
                'id_tecnico': r['id_tecnico'],
                'nome': r['nome'],
                'email': r.get('email'),
                'telefone': r.get('telefone'),
                'especialidade': r.get('especialidade'),
                'nivel_experiencia': r.get('nivel_experiencia'),
                'preco_hora': float(r.get('preco_hora', 100.00)),
                'status': status_to_text(r.get('status', 1)),
                'data_cadastro': r.get('data_cadastro'),
                'data_contratacao': r.get('data_contratacao'),
                'empresa': r.get('empresa'),
                'id_empresa_cliente': r.get('id_empresa_cliente'),
                'alocacoes': r.get('total_alocacoes') or 0
            })
        return jsonify({'success': True, 'tecnicos': tecnicos})
    except Exception as e:
        logger.exception("api_tecnicos failed")
        return jsonify({'error': str(e)}), 500

@bp.post('/api/tecnicos/novo')
def api_tecnico_novo():
    """Cria um novo técnico no sistema"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        data = request.get_json() or {}
        nome = (data.get('nome') or '').strip()
        especialidade = (data.get('especialidade') or '').strip()
        
        # Validações obrigatórias
        if not nome:
            return jsonify({'error': 'Nome é obrigatório'}), 400
        if not especialidade:
            return jsonify({'error': 'Especialidade é obrigatória'}), 400
        
        # Campos opcionais
        email = (data.get('email') or '').strip() or None
        telefone = (data.get('telefone') or '').strip() or None
        id_empresa = data.get('id_empresa_cliente') or None
        status_bit = status_to_bit(data.get('status', 'ativo'))
        nivel_experiencia = (data.get('nivel_experiencia') or 'Junior').strip()
        
        # Tratamento do preço por hora
        preco_hora = data.get('preco_hora')
        if preco_hora is None or preco_hora == '':
            preco_hora = 100.00
        else:
            try:
                preco_hora = float(preco_hora)
                if preco_hora < 0:
                    preco_hora = 100.00
            except (ValueError, TypeError):
                preco_hora = 100.00
        
        # Data de contratação padrão é hoje
        data_contratacao = data.get('data_contratacao') or date.today().isoformat()
        
        # Monta a query dinamicamente com os campos fornecidos
        cols = ["nome", "especialidade", "status", "nivel_experiencia", "preco_hora", "data_contratacao"]
        vals = [nome, especialidade, status_bit, nivel_experiencia, preco_hora, data_contratacao]
        
        if email:
            cols.append("email")
            vals.append(email)
        if telefone:
            cols.append("telefone")
            vals.append(telefone)
        if id_empresa:
            cols.append("id_empresa_cliente_fk")
            vals.append(id_empresa)
        
        # Insere no banco de dados
        placeholders = ", ".join(["%s"] * len(vals))
        exec_write(f"INSERT INTO tecnico ({', '.join(cols)}) VALUES ({placeholders})", tuple(vals))
        cache.clear()
        
        # Busca o técnico recém-criado para retornar
        novo = fetch_one("""
            SELECT
                t.id_tecnico, t.nome, t.email, t.telefone, t.especialidade, 
                t.nivel_experiencia, t.preco_hora, t.status, t.data_cadastro, t.data_contratacao,
                ec.nome AS empresa, ec.id_empresa_cliente
            FROM tecnico t
            LEFT JOIN empresa_cliente ec ON ec.id_empresa_cliente = t.id_empresa_cliente_fk
            WHERE t.nome=%s
            ORDER BY t.id_tecnico DESC
            LIMIT 1
        """, (nome,))
        
        if not novo:
            return jsonify({'success': True, 'message': 'Técnico criado'}), 201
        
        # Formata os dados para retorno
        novo['status'] = status_to_text(novo.get('status', 1))
        novo['preco_hora'] = float(novo.get('preco_hora', 100.00))
        novo['alocacoes'] = _count("SELECT COUNT(*) c FROM alocacao_tecnico WHERE id_tecnico_fk=%s", (novo['id_tecnico'],))
        novo['observacoes'] = ''
        
        return jsonify({'success': True, 'tecnico': novo}), 201
    except Exception as e:
        logger.exception("api_tecnico_novo failed")
        return jsonify({'error': str(e)}), 500

@bp.get('/api/tecnicos/<id>')
def api_tecnico_get(id):
    """Busca um técnico específico pelo ID"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        t = fetch_one("""
            SELECT 
                t.id_tecnico, 
                t.nome, 
                t.email, 
                t.telefone, 
                t.especialidade,
                t.nivel_experiencia,
                t.preco_hora,
                t.status, 
                t.data_cadastro,
                t.data_contratacao,
                ec.nome AS empresa, 
                ec.id_empresa_cliente
            FROM tecnico t
            LEFT JOIN empresa_cliente ec ON ec.id_empresa_cliente = t.id_empresa_cliente_fk
            WHERE t.id_tecnico = %s
        """, (id,))
        
        if not t:
            return jsonify({'error': 'Técnico não encontrado'}), 404
        
        # Formata os dados para retorno
        t['status'] = status_to_text(t.get('status', 1))
        t['preco_hora'] = float(t.get('preco_hora', 100.00))
        t['alocacoes'] = _count("SELECT COUNT(*) c FROM alocacao_tecnico WHERE id_tecnico_fk=%s", (t['id_tecnico'],))
        t['observacoes'] = ''
        
        return jsonify({'success': True, 'tecnico': t})
    except Exception as e:
        logger.exception("api_tecnico_get failed")
        return jsonify({'error': str(e)}), 500

@bp.put('/api/tecnicos/<id>')
def api_tecnico_edit(id):
    """Atualiza os dados de um técnico existente"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        data = request.get_json() or {}
        campos = []
        valores = []
        
        # Verifica quais campos foram enviados para atualizar
        for campo, col in [
            ('nome', 'nome'),
            ('email', 'email'),
            ('telefone', 'telefone'),
            ('especialidade', 'especialidade'),
            ('nivel_experiencia', 'nivel_experiencia'),
            ('preco_hora', 'preco_hora'),
            ('id_empresa_cliente', 'id_empresa_cliente_fk'),
            ('data_contratacao', 'data_contratacao')
        ]:
            v = data.get(campo)
            if v is not None:
                # Validação especial para preço por hora
                if campo == 'preco_hora':
                    try:
                        v = float(v)
                        if v < 0:
                            continue
                    except (ValueError, TypeError):
                        continue
                campos.append(f"{col}=%s")
                valores.append(v)
        
        # Tratamento especial para status (converte texto para bit)
        if 'status' in data:
            campos.append("status=%s")
            valores.append(status_to_bit(data['status']))
        
        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar'}), 400
        
        # Executa o UPDATE no banco
        valores.append(id)
        sql = f"UPDATE tecnico SET {', '.join(campos)} WHERE id_tecnico=%s"
        res = exec_write(sql, tuple(valores))
        
        if not res:
            return jsonify({'error': 'Técnico não encontrado ou nenhum dado alterado'}), 404
        
        cache.clear()
        
        # Retorna os dados atualizados
        return api_tecnico_get(id)
    except Exception as e:
        logger.exception("api_tecnico_edit failed")
        return jsonify({'error': str(e)}), 500

@bp.post('/api/tecnicos/<id>/editar')
def api_tecnico_edit_post(id):
    """Rota alternativa POST para edição (compatibilidade)"""
    return api_tecnico_edit(id)

@bp.delete('/api/tecnicos/<id>')
def api_tecnico_delete(id):
    """Exclui um técnico do sistema"""
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        res = exec_write("DELETE FROM tecnico WHERE id_tecnico=%s", (id,))
        cache.clear()
        if not res:
            return jsonify({'error': 'Técnico não encontrado'}), 404
        return jsonify({'success': True}), 200
    except Exception as e:
        logger.exception("api_tecnico_delete failed")
        return jsonify({'error': str(e)}), 500
