from flask import Blueprint, request, jsonify, session
from app import fetch_one, fetch_all, exec_write, _count, is_admin, cache, get_conn, logger

bp = Blueprint('empresa', __name__)

@bp.route('/api/empresas', methods=['GET'])
def api_empresas():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        empresas = fetch_all("""
            SELECT
                ec.id_empresa_cliente,
                ec.nome,
                ec.CNPJ as cnpj,
                ec.email,
                ec.telefone,
                ec.id_logradouro_fk,
                l.logradouro,
                l.nome_logradouro,
                l.numero,
                l.complemento,
                l.bairro,
                l.cidade,
                l.estado,
                l.cep,
                COUNT(DISTINCT s.protocolo) AS contratos
            FROM empresa_cliente ec
            LEFT JOIN logradouro l ON l.id_logradouro = ec.id_logradouro_fk
            LEFT JOIN servico s ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            GROUP BY ec.id_empresa_cliente
            ORDER BY ec.nome
        """)
        return jsonify({'success': True, 'empresas': empresas})
    except Exception as e:
        logger.exception("api_empresas failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/empresas/<id>', methods=['GET'])
def api_empresa_detalhe(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        empresa = fetch_one("""
            SELECT
                ec.id_empresa_cliente,
                ec.nome,
                ec.CNPJ as cnpj,
                ec.email,
                ec.telefone,
                ec.id_logradouro_fk,
                l.logradouro,
                l.nome_logradouro,
                l.numero,
                l.complemento,
                l.bairro,
                l.cidade,
                l.estado,
                l.cep,
                COUNT(DISTINCT s.protocolo) AS contratos
            FROM empresa_cliente ec
            LEFT JOIN logradouro l ON l.id_logradouro = ec.id_logradouro_fk
            LEFT JOIN servico s ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
            WHERE ec.id_empresa_cliente = %s
            GROUP BY ec.id_empresa_cliente
        """, (id,))
        if not empresa:
            return jsonify({'success': False, 'error': 'Empresa não encontrada'}), 404
        return jsonify({'success': True, 'empresa': empresa}), 200
    except Exception as e:
        logger.exception("api_empresa_detalhe failed")
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/api/empresas/novo', methods=['POST'])
def api_empresa_criar():
    if not is_admin():
        return jsonify({'error': 'Apenas administradores'}), 403
    try:
        data = request.get_json() or {}

        # Dados da empresa
        nome_empresa = (data.get('nome') or '').strip()
        if not nome_empresa:
            return jsonify({'error': 'Nome da empresa é obrigatório'}), 400

        cnpj = (data.get('cnpj') or '').strip() or None
        email = (data.get('email') or '').strip() or None
        telefone = (data.get('telefone') or '').strip() or None

        # ✅ DADOS DE ENDEREÇO
        cep = (data.get('cep') or '').replace('-', '').strip()
        tipo_logradouro = (data.get('tipo_logradouro') or '').strip()
        nome_logradouro = (data.get('nome_logradouro') or '').strip()
        numero = (data.get('numero') or '').strip()
        complemento = (data.get('complemento') or '').strip()
        bairro = (data.get('bairro') or '').strip()
        cidade = (data.get('cidade') or '').strip()
        estado = (data.get('estado') or '').strip()

        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        try:
            id_logradouro = None

            # ✅ SÓ CRIA LOGRADOURO SE TIVER OS CAMPOS OBRIGATÓRIOS
            if cep and cidade and tipo_logradouro:
                # Garante que CEP tem 8 dígitos
                if len(cep) != 8:
                    cep = cep.zfill(8)  # Preenche com zeros à esquerda

                cur.execute("""
                    INSERT INTO logradouro
                        (cep, estado, cidade, logradouro, nome_logradouro, numero, complemento, bairro)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    cep,                           # NOT NULL
                    estado or 'SP',                # Padrão SP se vazio
                    cidade,                        # NOT NULL
                    tipo_logradouro,               # NOT NULL (Rua, Avenida, etc)
                    nome_logradouro or '',         # NULL permitido
                    numero or '',                  # NULL permitido
                    complemento or '',             # NULL permitido
                    bairro or ''                   # NULL permitido
                ))
                id_logradouro = cur.lastrowid
                logger.info(f"✅ Logradouro criado com ID: {id_logradouro}")

            # ✅ CRIA EMPRESA
            cols = ["nome"]
            vals = [nome_empresa]

            if cnpj:
                cols.append("CNPJ")
                vals.append(cnpj)
            if email:
                cols.append("email")
                vals.append(email)
            if telefone:
                cols.append("telefone")
                vals.append(telefone)
            if id_logradouro:
                cols.append("id_logradouro_fk")
                vals.append(id_logradouro)
                logger.info(f"✅ Vinculando empresa ao logradouro ID: {id_logradouro}")

            placeholders = ", ".join(["%s"] * len(vals))
            query_empresa = f"INSERT INTO empresa_cliente ({', '.join(cols)}) VALUES ({placeholders})"

            cur.execute(query_empresa, tuple(vals))
            conn.commit()
            cache.clear()

            # ✅ RETORNA A EMPRESA CRIADA COM ENDEREÇO
            nova = fetch_one("""
                SELECT
                    ec.id_empresa_cliente,
                    ec.nome,
                    ec.CNPJ as cnpj,
                    ec.email,
                    ec.telefone,
                    ec.id_logradouro_fk,
                    l.logradouro,
                    l.nome_logradouro,
                    l.numero,
                    l.complemento,
                    l.bairro,
                    l.cidade,
                    l.estado,
                    l.cep,
                    0 AS contratos
                FROM empresa_cliente ec
                LEFT JOIN logradouro l ON l.id_logradouro = ec.id_logradouro_fk
                WHERE ec.id_empresa_cliente = LAST_INSERT_ID()
            """)

            return jsonify({'success': True, 'empresa': nova}), 201

        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Erro ao criar empresa: {str(e)}")
            raise
        finally:
            if cur: cur.close()
            if conn: conn.close()

    except Exception as e:
        logger.exception("api_empresa_criar failed")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/empresas/<id>', methods=['PUT'])
def api_empresa_atualizar(id):
    if not is_admin():
        return jsonify({'error': 'Apenas administradores'}), 403
    try:
        empresa = fetch_one("SELECT id_empresa_cliente, id_logradouro_fk FROM empresa_cliente WHERE id_empresa_cliente=%s", (id,))
        if not empresa:
            return jsonify({'error': 'Empresa não encontrada'}), 404

        data = request.get_json() or {}

        campos_empresa, valores_empresa = [], []
        if 'nome' in data and data['nome'].strip():
            campos_empresa.append('nome = %s')
            valores_empresa.append(data['nome'].strip())
        if 'cnpj' in data:
            campos_empresa.append('CNPJ = %s')
            valores_empresa.append(data['cnpj'].strip() or None)
        if 'email' in data:
            campos_empresa.append('email = %s')
            valores_empresa.append(data['email'].strip() or None)
        if 'telefone' in data:
            campos_empresa.append('telefone = %s')
            valores_empresa.append(data['telefone'].strip() or None)

        id_logradouro = empresa.get('id_logradouro_fk')
        nome_logradouro = (data.get('nome_logradouro') or '').strip()
        cidade = (data.get('cidade') or '').strip()

        conn = get_conn()
        cur = conn.cursor(dictionary=True)
        try:
            if nome_logradouro and cidade:
                if id_logradouro:
                    cur.execute("""
                        UPDATE logradouro SET
                            logradouro = %s,
                            nome_logradouro = %s,
                            numero = %s,
                            complemento = %s,
                            bairro = %s,
                            cidade = %s,
                            estado = %s,
                            cep = %s
                        WHERE id_logradouro = %s
                    """, (
                        data.get('tipo_logradouro'), nome_logradouro, data.get('numero'),
                        data.get('complemento'), data.get('bairro'), cidade, data.get('estado'),
                        data.get('cep'), id_logradouro
                    ))
                else:
                    cur.execute("""
                        INSERT INTO logradouro
                            (logradouro, nome_logradouro, numero, complemento, bairro, cidade, estado, cep)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        data.get('tipo_logradouro'), nome_logradouro, data.get('numero'),
                        data.get('complemento'), data.get('bairro'), cidade, data.get('estado'),
                        data.get('cep')
                    ))
                    id_logradouro = cur.lastrowid
                    campos_empresa.append('id_logradouro_fk = %s')
                    valores_empresa.append(id_logradouro)

            if campos_empresa:
                valores_empresa.append(id)
                query = f"UPDATE empresa_cliente SET {', '.join(campos_empresa)} WHERE id_empresa_cliente = %s"
                cur.execute(query, tuple(valores_empresa))

            conn.commit()
            cache.clear()
            return jsonify({'success': True, 'message': 'Empresa atualizada'}), 200
        except Exception as e:
            conn.rollback()
            logger.error(f"Erro ao atualizar: {str(e)}")
            raise
        finally:
            if cur: cur.close()
            if conn: conn.close()
    except Exception as e:
        logger.exception("api_empresa_atualizar failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/empresas/<id>', methods=['DELETE'])
def api_empresa_deletar(id):
    if not is_admin():
        return jsonify({'error': 'Apenas administradores'}), 403
    try:
        servicos = _count("SELECT COUNT(*) c FROM servico WHERE id_empresa_cliente_fk=%s", (id,))
        if servicos > 0:
            return jsonify({'error': f'Não é possível excluir. Empresa possui {servicos} serviço(s) vinculado(s).'}), 400

        rows = exec_write("DELETE FROM empresa_cliente WHERE id_empresa_cliente = %s", (id,))
        cache.clear()

        if rows == 0:
            return jsonify({'error': 'Empresa não encontrada'}), 404

        return jsonify({'success': True, 'message': 'Empresa deletada'}), 200
    except Exception as e:
        logger.exception("api_empresa_deletar failed")
        return jsonify({'error': str(e)}), 500
