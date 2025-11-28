from flask import Blueprint, request, render_template, redirect, url_for, session, flash, jsonify, make_response
from mysql.connector import errors as mysql_errors
import logging
import csv
from io import StringIO
from datetime import date, timedelta

# Importar funções auxiliares do app principal
from app import (
    fetch_one, fetch_all, exec_write, _count, is_admin, cache, logger
)

bp = Blueprint('servico', __name__)


# ========== API DE SERVIÇOS ==========
@bp.route('/api/servicos', methods=['GET'])
def api_servicos():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        user_id = session['usuario_id']
        user_admin = is_admin()
        try:
            if user_admin:
                # ADMIN vê TODOS os serviços
                servicos = fetch_all("""
                    SELECT
                        s.protocolo,
                        s.id_empresa_cliente_fk,
                        ec.nome as empresa,
                        s.problema,
                        COALESCE(s.categoria, 'Hardware') as categoria,
                        s.prioridade,
                        s.status,
                        s.prazo_estimado as prazo,
                        s.data_abertura,
                        s.id_usuario_criador,
                        u.nome as cliente
                    FROM servico s
                    LEFT JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
                    ORDER BY s.data_abertura DESC
                """)
            else:
                # USUÁRIO vê apenas SEUS serviços
                servicos = fetch_all("""
                    SELECT
                        s.protocolo,
                        s.id_empresa_cliente_fk,
                        ec.nome as empresa,
                        s.problema,
                        COALESCE(s.categoria, 'Hardware') as categoria,
                        s.prioridade,
                        s.status,
                        s.prazo_estimado as prazo,
                        s.data_abertura,
                        s.id_usuario_criador,
                        u.nome as cliente
                    FROM servico s
                    LEFT JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
                    WHERE s.id_usuario_criador = %s
                    ORDER BY s.data_abertura DESC
                """, (user_id,))

        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1054:
                logger.warning("Coluna id_usuario_criador não existe. Usando modo compatibilidade.")
                if user_admin:
                    servicos = fetch_all("""
                        SELECT
                            s.protocolo,
                            s.id_empresa_cliente_fk,
                            ec.nome as empresa,
                            s.problema,
                            s.prioridade,
                            s.status,
                            s.prazo_estimado as prazo,
                            s.data_abertura
                        FROM servico s
                        JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                        ORDER BY s.data_abertura DESC
                    """)
                else:
                    servicos = fetch_all("""
                        SELECT
                            s.protocolo,
                            s.id_empresa_cliente_fk,
                            ec.nome as empresa,
                            s.problema,
                            s.prioridade,
                            s.status,
                            s.prazo_estimado as prazo,
                            s.data_abertura
                        FROM servico s
                        JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                        ORDER BY s.data_abertura DESC
                        LIMIT 50
                    """)
                for s in servicos:
                    s['cliente'] = session.get('usuario_nome', 'N/A')
                    s['id_usuario_criador'] = user_id
                    s['categoria'] = 'Hardware'
            else:
                raise
        servicos_formatados = []
        for s in servicos:
            servicos_formatados.append({
                'protocolo': s['protocolo'],
                'empresa': s['empresa'],
                'cliente': s.get('cliente') or session.get('usuario_nome', 'N/A'),
                'id_usuario_criador': s.get('id_usuario_criador') or user_id,
                'problema': s['problema'],
                'categoria': s.get('categoria', 'Hardware'),
                'prioridade': s['prioridade'],
                'status': s['status'],
                'prazo': s['prazo'].strftime('%Y-%m-%d') if s['prazo'] else '',
            })
        return jsonify({
            'success': True,
            'servicos': servicos_formatados,
            'user_role': 'admin' if user_admin else 'user',
            'user_id': user_id,
            'user_name': session.get('usuario_nome', '')
        })
    except Exception as e:
        logger.exception("api_servicos failed")
        return jsonify({'error': str(e)}), 500

# Outras rotas (editar, deletar, criar, detalhe, vitrine e exportação) seguem padrão semelhante e podem ser enviadas em sequência.


@bp.route('/api/servicos/<protocolo>', methods=['GET'])
def api_servico_detalhe(protocolo):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        user_id = session['usuario_id']
        user_admin = is_admin()
        try:
            servico = fetch_one("""
                SELECT
                    s.protocolo,
                    ec.nome as empresa,
                    s.problema,
                    COALESCE(s.categoria, 'Hardware') as categoria,
                    s.prioridade,
                    s.status,
                    s.prazo_estimado as prazo,
                    s.data_abertura,
                    s.id_usuario_criador,
                    u.nome as cliente
                FROM servico s
                JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
                WHERE s.protocolo = %s
            """, (protocolo,))
        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1054:
                servico = fetch_one("""
                    SELECT
                        s.protocolo,
                        ec.nome as empresa,
                        s.problema,
                        s.prioridade,
                        s.status,
                        s.prazo_estimado as prazo,
                        s.data_abertura
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    WHERE s.protocolo = %s
                """, (protocolo,))
                if servico:
                    servico['cliente'] = session.get('usuario_nome', 'N/A')
                    servico['id_usuario_criador'] = user_id
                    servico['categoria'] = 'Hardware'
            else:
                raise
        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        if not user_admin and servico.get('id_usuario_criador') != user_id:
            return jsonify({'error': 'Sem permissão para ver este serviço'}), 403
        return jsonify({
            'success': True,
            'servico': {
                'protocolo': servico['protocolo'],
                'empresa': servico['empresa'],
                'cliente': servico.get('cliente', 'N/A'),
                'problema': servico['problema'],
                'categoria': servico.get('categoria', 'Hardware'),
                'prioridade': servico['prioridade'],
                'status': servico['status'],
                'prazo': servico['prazo'].strftime('%Y-%m-%d') if servico['prazo'] else '',
            }
        })
    except Exception as e:
        logger.exception("api_servico_detalhe failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/servicos/<protocolo>', methods=['PUT'])
def api_servico_atualizar(protocolo):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        user_id = session['usuario_id']
        user_admin = is_admin()
        user_tecnico = False  # Implemente verificação de papel técnico se existir
        # Busca serviço e permissões do usuário
        servico = fetch_one("SELECT id_usuario_criador FROM servico WHERE protocolo = %s", (protocolo,))
        if not servico:
            return jsonify({'error': 'Serviço não encontrado'}), 404

        # Verifica permissão básica para visualizar/editar
        if not user_admin:
            if servico['id_usuario_criador'] != user_id:
                # Aqui poderia permitir técnicos editarem serviços alocados a eles, depende da regra
                return jsonify({'error': 'Sem permissão para editar este serviço'}), 403

        data = request.get_json()

        # Define campos permitidos por perfil
        if user_admin:
            allowed_fields = {'prioridade', 'status', 'problema', 'categoria', 'prazo_estimado'}
        elif user_tecnico:
            allowed_fields = {'status', 'problema'}  # técnico só pode alterar status e problema
        else:
            allowed_fields = {'problema'}  # usuário comum só altera problema

        # Filtra campos enviados para apenas permitidos
        data_filtrada = {k: v for k, v in data.items() if k in allowed_fields}
        if not data_filtrada:
            return jsonify({'error': 'Nenhum campo permitido para atualizar'}), 403

        campos = [f"{campo} = %s" for campo in data_filtrada]
        valores = list(data_filtrada.values())
        valores.append(protocolo)

        rows = exec_write(f"UPDATE servico SET {', '.join(campos)} WHERE protocolo = %s", tuple(valores))
        cache.clear()
        if rows == 0:
            return jsonify({'error': 'Serviço não encontrado'}), 404

        return jsonify({'success': True, 'message': 'Serviço atualizado com sucesso'})

    except Exception as e:
        logger.exception("api_servico_atualizar failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/servicos/<protocolo>', methods=['DELETE'])
def api_servico_deletar(protocolo):
    if not is_admin():
        return jsonify({'error': 'Apenas administradores podem excluir serviços'}), 403
    try:
        rows = exec_write("DELETE FROM servico WHERE protocolo = %s", (protocolo,))
        cache.clear()
        if rows == 0:
            return jsonify({'error': 'Serviço não encontrado'}), 404
        return jsonify({'success': True, 'message': 'Serviço deletado com sucesso'})
    except Exception as e:
        logger.exception("api_servico_deletar failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/servicos/novo', methods=['POST'])
def api_servico_criar():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    # REMOVIDO O BLOQUEIO - Agora qualquer usuário autenticado pode criar serviços
    try:
        data = request.get_json()
        user_id = session['usuario_id']

        # Validações
        if not data.get('id_empresa_cliente'):
            return jsonify({'error': 'Empresa é obrigatória'}), 400
        if not data.get('problema'):
            return jsonify({'error': 'Problema é obrigatório'}), 400
        if not data.get('prioridade'):
            return jsonify({'error': 'Prioridade é obrigatória'}), 400

        prazo = data.get('prazo_estimado') or (date.today() + timedelta(days=7)).strftime('%Y-%m-%d')
        categoria = data.get('categoria', 'Hardware')

        try:
            exec_write("""
                INSERT INTO servico
                    (id_empresa_cliente_fk, problema, categoria, prioridade,
                     status, prazo_estimado, data_abertura, id_usuario_criador)
                VALUES (%s, %s, %s, %s, 'aberta', %s, NOW(), %s)
            """, (data['id_empresa_cliente'], data['problema'],
                  categoria, data['prioridade'], prazo, user_id))

            ultimo = fetch_one("SELECT protocolo FROM servico ORDER BY protocolo DESC LIMIT 1")
            novo_protocolo = ultimo['protocolo'] if ultimo else 1

        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1054:
                logger.warning("Colunas id_usuario_criador ou categoria não existem.")
                exec_write("""
                    INSERT INTO servico
                        (id_empresa_cliente_fk, problema, prioridade, status, prazo_estimado, data_abertura)
                    VALUES (%s, %s, %s, 'aberta', %s, NOW())
                """, (data['id_empresa_cliente'], data['problema'],
                      data['prioridade'], prazo))

                ultimo = fetch_one("SELECT protocolo FROM servico ORDER BY protocolo DESC LIMIT 1")
                novo_protocolo = ultimo['protocolo'] if ultimo else 1
            else:
                raise

        cache.clear()

        return jsonify({
            'success': True,
            'message': 'Serviço criado com sucesso',
            'protocolo': novo_protocolo
        }), 201

    except Exception as e:
        logger.exception("api_servico_criar failed")
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/api/servicos/vitrine', methods=['GET'])
def api_servicos_vitrine():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        user_id = session['usuario_id']
        user_admin = is_admin()
        try:
            if user_admin:
                vitrine = fetch_all("""
                    SELECT
                        COALESCE(categoria, 'Hardware') as categoria,
                        COUNT(*) as total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) as abertos,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidos,
                        SUM(CASE WHEN prioridade = 'urgente' THEN 1 ELSE 0 END) as urgentes
                    FROM servico
                    GROUP BY categoria
                    ORDER BY categoria
                """)
            else:
                vitrine = fetch_all("""
                    SELECT
                        COALESCE(categoria, 'Hardware') as categoria,
                        COUNT(*) as total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) as abertos,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidos,
                        SUM(CASE WHEN prioridade = 'urgente' THEN 1 ELSE 0 END) as urgentes
                    FROM servico
                    WHERE id_usuario_criador = %s
                    GROUP BY categoria
                    ORDER BY categoria
                """, (user_id,))
        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1054:
                vitrine = []
            else:
                raise
        categorias = ['Hardware', 'Software', 'Redes', 'Suporte']
        vitrine_dict = {v['categoria']: v for v in vitrine}
        resultado = []
        for cat in categorias:
            if cat in vitrine_dict:
                resultado.append(vitrine_dict[cat])
            else:
                resultado.append({
                    'categoria': cat,
                    'total': 0,
                    'abertos': 0,
                    'concluidos': 0,
                    'urgentes': 0
                })
        return jsonify({'success': True, 'vitrine': resultado})
    except Exception as e:
        logger.exception("api_servicos_vitrine failed")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/api/servicos/exportar')
def api_servicos_exportar():
    if 'usuario_id' not in session:
        flash('Faça login para exportar', 'warning')
        return redirect(url_for('pagina.home'))
    try:
        user_id = session['usuario_id']
        user_admin = is_admin()
        try:
            if user_admin:
                servicos = fetch_all("""
                    SELECT s.protocolo, ec.nome empresa, u.nome cliente,
                           COALESCE(s.categoria, 'Hardware') categoria,
                           s.problema, s.prioridade, s.status, s.prazo_estimado
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
                    ORDER BY s.data_abertura DESC
                """)
            else:
                servicos = fetch_all("""
                    SELECT s.protocolo, ec.nome empresa, u.nome cliente,
                           COALESCE(s.categoria, 'Hardware') categoria,
                           s.problema, s.prioridade, s.status, s.prazo_estimado
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
                    WHERE s.id_usuario_criador = %s
                    ORDER BY s.data_abertura DESC
                """, (user_id,))
        except mysql_errors.ProgrammingError as e:
            if getattr(e, 'errno', None) == 1054:
                servicos = fetch_all("""
                    SELECT s.protocolo, ec.nome empresa, s.problema, s.prioridade, s.status, s.prazo_estimado
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    ORDER BY s.data_abertura DESC
                    LIMIT 100
                """)
                for s in servicos:
                    s['cliente'] = session.get('usuario_nome', 'N/A')
                    s['categoria'] = 'Hardware'
            else:
                raise
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(['Protocolo', 'Empresa', 'Cliente', 'Categoria', 'Problema', 'Prioridade', 'Status', 'Prazo'])
        for s in servicos:
            prazo_str = s['prazo_estimado'].strftime('%d/%m/%Y') if s['prazo_estimado'] else '-'
            writer.writerow([
                s['protocolo'],
                s['empresa'],
                s.get('cliente', 'N/A'),
                s.get('categoria', 'Hardware'),
                s['problema'],
                s['prioridade'],
                s['status'],
                prazo_str
            ])
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=servicos.csv"
        output.headers["Content-type"] = "text/csv; charset=utf-8"
        return output
    except Exception as e:
        logger.exception("api_servicos_exportar failed")
        flash(f'Erro ao exportar: {e}', 'danger')
        return redirect(url_for('pagina.servicos'))

@bp.route('/api/meus-servicos', methods=['GET'])
def api_meus_servicos():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        user_id = session['usuario_id']
        servicos = fetch_all("""
            SELECT
              s.protocolo, s.id_empresa_cliente_fk, ec.nome as empresa, s.problema,
              COALESCE(s.categoria, 'Hardware') as categoria, s.prioridade,
              s.status, s.prazo_estimado as prazo, s.data_abertura, s.id_usuario_criador, u.nome as cliente
            FROM servico s
            JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            LEFT JOIN usuario u ON s.id_usuario_criador = u.id_usuario
            WHERE s.id_usuario_criador = %s
            ORDER BY s.data_abertura DESC
        """, (user_id,))

        servicos_formatados = []
        for s in servicos:
            servicos_formatados.append({
                'protocolo': s['protocolo'],
                'empresa': s['empresa'],
                'cliente': s.get('cliente') or session.get('usuario_nome', 'N/A'),
                'id_usuario_criador': s.get('id_usuario_criador') or user_id,
                'problema': s['problema'],
                'categoria': s.get('categoria', 'Hardware'),
                'prioridade': s['prioridade'],
                'status': s['status'],
                'prazo': s['prazo'].strftime('%Y-%m-%d') if s['prazo'] else '',
            })

        return jsonify({
            'success': True,
            'servicos': servicos_formatados,
            'user_role': 'user',
            'user_id': user_id,
            'user_name': session.get('usuario_nome', '')
        })
    except Exception as e:
        logger.exception("api_meus_servicos failed")
        return jsonify({'error': str(e)}), 500


@bp.route('/meus-servicos')
def meus_servicos():
    if 'usuario_id' not in session:
        flash('Você precisa estar logado para acessar essa página.', 'warning')
        return redirect(url_for('pagina.home'))

    user_id = session['usuario_id']

    try:
        servicos = fetch_all("""
            SELECT s.protocolo, ec.nome nome_empresa, s.problema, s.categoria, s.prioridade, s.status, s.prazo_estimado, s.data_abertura
            FROM servico s
            LEFT JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            WHERE s.id_usuario_criador = %s
            ORDER BY s.data_abertura DESC
        """, (user_id,))
    except Exception as e:
        logger.exception("Erro ao buscar serviços do usuário")
        flash('Erro ao carregar seus serviços.', 'danger')
        servicos = []

    return render_template(
        'servicos.html',
        servicos=servicos,
        user_name=session.get('usuario_nome'),
        admin=False,
        meus_servicos=True  # flag para frontend saber que é só do usuário
    )

