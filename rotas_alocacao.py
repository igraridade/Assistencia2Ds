from flask import Blueprint, request, jsonify, session
from mysql.connector import errors as mysql_errors
import logging

from automacao_alocacao import atualizar_empresa_tecnico_hook
from app import (
    fetch_one, fetch_all, exec_write, cache, logger
)

bp = Blueprint('alocacao', __name__)


@bp.route('/api/alocacoes', methods=['GET'])
def api_alocacoes_listar():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        rows = fetch_all("""
            SELECT
                a.id_alocacao_tecnico AS id_alocacao,
                a.data_inicio_alocacao AS data_alocacao,
                a.data_fim_alocacao,
                a.protocolo_fk AS protocolo,
                t.id_tecnico,
                t.nome AS tecnico_nome,
                s.protocolo,
                s.problema AS servico_nome,
                ec.id_empresa_cliente AS id_empresa,
                ec.nome AS empresa_nome,
                s.status
            FROM alocacao_tecnico a
            LEFT JOIN tecnico t ON t.id_tecnico = a.id_tecnico_fk
            LEFT JOIN servico s ON s.protocolo = a.protocolo_fk
            LEFT JOIN empresa_cliente ec ON ec.id_empresa_cliente = s.id_empresa_cliente_fk
            ORDER BY a.data_inicio_alocacao DESC
            LIMIT 100
        """)
        return jsonify({"alocacoes": rows})
    except Exception as err:
        logger.exception("Erro ao listar alocações")
        return jsonify({"error": str(err)}), 500


@bp.route('/api/alocacoes', methods=['POST'])
def api_alocacoes_criar():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    data = request.get_json(silent=True) or {}
    id_tecnico = data.get('id_tecnico')
    servico_protocolo = data.get('servico_protocolo')
    data_aloc = data.get('data_alocacao')

    if not id_tecnico:
        return jsonify({'error': 'id_tecnico é obrigatório'}), 400
    if not servico_protocolo:
        return jsonify({'error': 'servico_protocolo é obrigatório'}), 400

    try:
        if data_aloc:
            sql = """
                INSERT INTO alocacao_tecnico (id_tecnico_fk, protocolo_fk, data_inicio_alocacao)
                VALUES (%s, %s, %s)
            """
            exec_write(sql, (id_tecnico, servico_protocolo, data_aloc))
        else:
            sql = """
                INSERT INTO alocacao_tecnico (id_tecnico_fk, protocolo_fk, data_inicio_alocacao)
                VALUES (%s, %s, NOW())
            """
            exec_write(sql, (id_tecnico, servico_protocolo))

        # Busca a alocação recém-criada para obter o ID
        nova = fetch_one("""
            SELECT id_alocacao_tecnico
            FROM alocacao_tecnico
            WHERE id_tecnico_fk = %s AND protocolo_fk = %s
            ORDER BY data_inicio_alocacao DESC
            LIMIT 1
        """, (id_tecnico, servico_protocolo))

        if nova:
            atualizar_empresa_tecnico_hook(
                int(id_tecnico),
                int(nova['id_alocacao_tecnico'])
            )

        cache.clear()
        return jsonify({'success': True, 'message': 'Alocação criada com sucesso'}), 201
    except Exception as e:
        logger.exception("Erro ao criar alocação")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/alocacoes/<id>', methods=['PUT'])
def api_alocacoes_editar(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    data = request.get_json(silent=True) or {}
    id_tecnico = data.get('id_tecnico')
    servico_protocolo = data.get('servico_protocolo')
    data_aloc = data.get('data_alocacao')

    if not id_tecnico:
        return jsonify({'error': 'id_tecnico é obrigatório'}), 400
    if not servico_protocolo:
        return jsonify({'error': 'servico_protocolo é obrigatório'}), 400

    fields = []
    vals = []

    fields.append('id_tecnico_fk = %s')
    vals.append(id_tecnico)

    fields.append('protocolo_fk = %s')
    vals.append(servico_protocolo)

    # Sempre atualizar a data se fornecida
    if data_aloc:
        fields.append('data_inicio_alocacao = %s')
        vals.append(data_aloc)

    sql = f"UPDATE alocacao_tecnico SET {', '.join(fields)} WHERE id_alocacao_tecnico = %s"
    vals.append(id)

    try:
        exec_write(sql, tuple(vals))
        cache.clear()
        return jsonify({'success': True, 'message': 'Alocação atualizada com sucesso'})
    except Exception as e:
        logger.exception("Erro ao atualizar alocação")
        return jsonify({'error': str(e)}), 400


@bp.route('/api/alocacoes/<id>', methods=['DELETE'])
def api_alocacoes_deletar(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    try:
        sql = "DELETE FROM alocacao_tecnico WHERE id_alocacao_tecnico = %s"
        exec_write(sql, (id,))
        cache.clear()
        return jsonify({'success': True, 'message': 'Alocação deletada com sucesso'})
    except Exception as e:
        logger.exception("Erro ao deletar alocação")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/alocacoes/<id>/concluir', methods=['POST'])
def api_alocacao_concluir(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    try:
        alocacao = fetch_one(
            "SELECT id_tecnico_fk, protocolo_fk FROM alocacao_tecnico WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        if not alocacao:
            return jsonify({'error': 'Alocação não encontrada'}), 404

        exec_write(
            "UPDATE servico SET status = 'concluida' WHERE protocolo = %s",
            (alocacao['protocolo_fk'],)
        )

        exec_write(
            "UPDATE alocacao_tecnico SET data_fim_alocacao = NOW() WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        # Atualiza empresa atual do técnico depois de concluir
        atualizar_empresa_tecnico_hook(
            int(alocacao['id_tecnico_fk']),
            int(id)
        )

        cache.clear()
        return jsonify({'success': True, 'message': 'Serviço marcado como concluído'})
    except Exception as e:
        logger.exception("Erro ao concluir serviço")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/alocacoes/<id>/pendente', methods=['POST'])
def api_alocacao_pendente(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    try:
        alocacao = fetch_one(
            "SELECT protocolo_fk FROM alocacao_tecnico WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        if not alocacao:
            return jsonify({'error': 'Alocação não encontrada'}), 404

        exec_write(
            "UPDATE servico SET status = 'pendente' WHERE protocolo = %s",
            (alocacao['protocolo_fk'],)
        )

        cache.clear()
        return jsonify({'success': True, 'message': 'Serviço marcado como pendente'})
    except Exception as e:
        logger.exception("Erro ao marcar serviço como pendente")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/alocacoes/<id>/em-andamento', methods=['POST'])
def api_alocacao_em_andamento(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    try:
        alocacao = fetch_one(
            "SELECT protocolo_fk FROM alocacao_tecnico WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        if not alocacao:
            return jsonify({'error': 'Alocação não encontrada'}), 404

        exec_write(
            "UPDATE servico SET status = 'em andamento' WHERE protocolo = %s",
            (alocacao['protocolo_fk'],)
        )

        cache.clear()
        return jsonify({'success': True, 'message': 'Serviço em andamento'})
    except Exception as e:
        logger.exception("Erro ao marcar serviço em andamento")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/alocacoes/<id>/reabrir', methods=['POST'])
def api_alocacao_reabrir(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401

    try:
        alocacao = fetch_one(
            "SELECT id_tecnico_fk, protocolo_fk FROM alocacao_tecnico WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        if not alocacao:
            return jsonify({'error': 'Alocação não encontrada'}), 404

        exec_write(
            "UPDATE servico SET status = 'aberta' WHERE protocolo = %s",
            (alocacao['protocolo_fk'],)
        )

        exec_write(
            "UPDATE alocacao_tecnico SET data_fim_alocacao = NULL WHERE id_alocacao_tecnico = %s",
            (id,)
        )

        # Ao reabrir, garante que o técnico fique associado de novo a essa empresa
        atualizar_empresa_tecnico_hook(
            int(alocacao['id_tecnico_fk']),
            int(id)
        )

        cache.clear()
        return jsonify({'success': True, 'message': 'Serviço reaberto'})
    except Exception as e:
        logger.exception("Erro ao reabrir serviço")
        return jsonify({'error': str(e)}), 500
