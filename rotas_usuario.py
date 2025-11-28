from flask import Blueprint, request, jsonify, session, flash, redirect, url_for
from mysql.connector import errors as mysql_errors
from werkzeug.security import generate_password_hash
from app import fetch_one, fetch_all, exec_write, get_conn, cache, logger, is_admin


bp = Blueprint('usuario', __name__)

@bp.route('/api/usuarios', methods=['GET'])
def api_usuarios():
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    if not is_admin():
        return jsonify({'error': 'Acesso negado'}), 403
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
                CASE WHEN admin = 1 THEN 'admin' ELSE 'usuario' END as perfil,
                'ativo' as status,
                data_cadastro as ultimoAcesso,
                id_empresa_cliente_fk
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
        usuarios_data = fetch_all(query, tuple(params) if params else None)
        for usuario in usuarios_data:
            if usuario.get('ultimoAcesso') and hasattr(usuario['ultimoAcesso'], 'isoformat'):
                usuario['ultimoAcesso'] = usuario['ultimoAcesso'].isoformat()
        return jsonify(usuarios_data), 200
    except Exception as e:
        logger.exception("api_usuarios failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/usuarios/<user_id>', methods=['GET'])
def api_usuario_detalhe(user_id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    if not is_admin():
        return jsonify({'error': 'Acesso negado'}), 403
    try:
        usuario = fetch_one("""
            SELECT
                u.id_usuario as id,
                u.nome,
                u.email,
                u.telefone,
                u.admin,
                u.data_cadastro,
                CASE WHEN u.admin = 1 THEN 'admin' ELSE 'usuario' END as perfil,
                ec.nome as nome_empresa,
                l.logradouro, l.nome_logradouro, l.numero, l.complemento, l.bairro, l.cidade, l.estado, l.cep
            FROM usuario u
            LEFT JOIN empresa_cliente ec ON u.id_empresa_cliente_fk = ec.id_empresa_cliente
            LEFT JOIN logradouro l ON ec.id_logradouro_fk = l.id_logradouro
            WHERE u.id_usuario = %s
        """, (user_id,))
        if not usuario:
            return jsonify({'success': False, 'error': 'Usuário não encontrado'}), 404
        if usuario.get('data_cadastro') and hasattr(usuario['data_cadastro'], 'isoformat'):
            usuario['data_cadastro'] = usuario['data_cadastro'].isoformat()
        return jsonify({'success': True, 'usuario': usuario}), 200
    except Exception as e:
        logger.exception("api_usuario_detalhe failed")
        return jsonify({'success': False, 'error': str(e)}), 500



@bp.route('/api/usuarios/novo', methods=['POST'])
def api_usuario_criar():
    from app import get_conn  # ✅ Import local

    try:
        # Aceita tanto JSON quanto form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()

        # Dados do usuário
        nome_usuario = (data.get('nome') or '').strip()
        email_usuario = (data.get('email') or '').strip().lower()
        senha_usuario = data.get('senha') or ''
        telefone_usuario = (data.get('telefone') or '').strip()

        # Dados da empresa
        empresa_cnpj = (data.get('empresa_cnpj') or '').replace('.', '').replace('-', '').replace('/', '').strip()
        empresa_nome = (data.get('empresa_nome') or '').strip()
        empresa_email = (data.get('empresa_email') or data.get('empresa_email_manual') or '').strip()
        empresa_telefone = (data.get('empresa_telefone') or '').strip()

        # DADOS DE ENDEREÇO
        empresa_tipo_logradouro = (data.get('empresa_logradouro') or 'Rua').strip()
        empresa_nome_logradouro = (data.get('empresa_nome_logradouro') or '').strip()
        empresa_numero = (data.get('empresa_numero') or '').strip()
        empresa_complemento = (data.get('empresa_complemento') or '').strip()
        empresa_bairro = (data.get('empresa_bairro') or '').strip()
        empresa_municipio = (data.get('empresa_municipio') or '').strip()
        empresa_uf = (data.get('empresa_uf') or '').strip()
        empresa_cep = (data.get('empresa_cep') or '').strip()

        # Validações
        if not all([nome_usuario, email_usuario, senha_usuario, telefone_usuario, empresa_cnpj]):
            flash('Preencha todos os campos obrigatórios', 'warning')
            return redirect(url_for('pagina.home'))

        if len(empresa_cnpj) != 14 or not empresa_cnpj.isdigit():
            flash('CNPJ inválido. Deve conter 14 dígitos', 'danger')
            return redirect(url_for('pagina.home'))

        # Verifica se email já existe
        existe = fetch_one("SELECT id_usuario FROM usuario WHERE email = %s", (email_usuario,))
        if existe:
            flash('Este e-mail já está cadastrado', 'warning')
            return redirect(url_for('pagina.home'))

        # Verifica se empresa existe
        empresa_existente = fetch_one("""
            SELECT id_empresa_cliente, id_logradouro_fk
            FROM empresa_cliente
            WHERE CNPJ = %s
        """, (empresa_cnpj,))

        # ✅ CONEXÃO DIRETA
        conn = get_conn()
        cur = conn.cursor(dictionary=True)

        try:
            if empresa_existente:
                id_empresa = empresa_existente['id_empresa_cliente']
                logger.info(f"✅ Empresa já existe com ID: {id_empresa}")
            else:
                # CRIA LOGRADOURO
                id_logradouro = None

                if empresa_cep or empresa_municipio:
                    if empresa_cep and len(empresa_cep) != 8:
                        empresa_cep = empresa_cep.zfill(8)

                    cur.execute("""
                        INSERT INTO logradouro (cep, estado, cidade, logradouro, nome_logradouro, numero, complemento, bairro)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        empresa_cep or '00000000',
                        empresa_uf or 'SP',
                        empresa_municipio or 'Não informado',
                        empresa_tipo_logradouro or 'Rua',
                        empresa_nome_logradouro or '',
                        empresa_numero or '',
                        empresa_complemento or '',
                        empresa_bairro or ''
                    ))
                    id_logradouro = cur.lastrowid
                    logger.info(f"✅ Logradouro criado com ID: {id_logradouro}")

                # CRIA EMPRESA
                cur.execute("""
                    INSERT INTO empresa_cliente (nome, CNPJ, email, telefone, id_logradouro_fk)
                    VALUES (%s, %s, %s, %s, %s)
                """, (empresa_nome, empresa_cnpj, empresa_email, empresa_telefone, id_logradouro))

                id_empresa = cur.lastrowid
                logger.info(f"✅ Empresa criada com ID: {id_empresa}")

            # CRIA USUÁRIO
            senha_hash = generate_password_hash(senha_usuario)
            cur.execute("""
                INSERT INTO usuario (nome, email, telefone, senha, admin, id_empresa_cliente_fk)
                VALUES (%s, %s, %s, %s, 0, %s)
            """, (nome_usuario, email_usuario, telefone_usuario, senha_hash, id_empresa))

            conn.commit()
            cache.clear()

            # INICIA SESSÃO
            novo_usuario = fetch_one("SELECT id_usuario FROM usuario WHERE email = %s", (email_usuario,))
            if novo_usuario:
                session['usuario_id'] = novo_usuario['id_usuario']
                session['usuario_nome'] = nome_usuario
                session['admin'] = False

            flash('Cadastro realizado com sucesso! Bem-vindo(a)!', 'success')
            return redirect(url_for('pagina.home'))

        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Erro: {str(e)}")
            raise
        finally:
            if cur: cur.close()
            if conn: conn.close()

    except Exception as e:
        logger.exception("api_usuario_criar failed")
        flash(f'Erro ao realizar cadastro: {str(e)}', 'danger')
        return redirect(url_for('pagina.home'))




@bp.route('/api/usuarios/<user_id>', methods=['PUT'])
def api_usuario_atualizar(user_id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    if not is_admin():
        return jsonify({'error': 'Apenas administradores podem editar usuários'}), 403
    try:
        usuario = fetch_one("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (user_id,))
        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        data = request.get_json() or {}
        campos, valores = [], []
        if 'nome' in data and data['nome']:
            campos.append('nome = %s')
            valores.append(data['nome'].strip())
        if 'email' in data and data['email']:
            email = data['email'].strip().lower()
            existe = fetch_one("SELECT id_usuario FROM usuario WHERE email = %s AND id_usuario != %s", (email, user_id))
            if existe:
                return jsonify({'error': 'Este e-mail já está sendo usado por outro usuário'}), 400
            campos.append('email = %s')
            valores.append(email)
        if 'telefone' in data and data['telefone']:
            campos.append('telefone = %s')
            valores.append(data['telefone'].strip())
        if 'admin' in data:
            campos.append('admin = %s')
            valores.append(1 if data['admin'] else 0)
        if 'id_empresa_cliente_fk' in data:
            id_empresa = data['id_empresa_cliente_fk']
            if id_empresa is not None:
                empresa = fetch_one("SELECT id_empresa_cliente FROM empresa_cliente WHERE id_empresa_cliente = %s", (id_empresa,))
                if not empresa:
                    return jsonify({'error': 'Empresa vinculada não existe'}), 400
            campos.append('id_empresa_cliente_fk = %s')
            valores.append(id_empresa)
        if 'senha' in data and data['senha']:
            campos.append('senha = %s')
            valores.append(generate_password_hash(data['senha']))
        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar'}), 400
        valores.append(user_id)
        query = f"UPDATE usuario SET {', '.join(campos)} WHERE id_usuario = %s"
        rows = exec_write(query, tuple(valores))
        cache.clear()
        if rows == 0:
            return jsonify({'error': 'Nenhuma alteração realizada'}), 400
        return jsonify({'success': True, 'message': 'Usuário atualizado com sucesso'}), 200
    except Exception as e:
        logger.exception("api_usuario_atualizar failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/usuarios/<user_id>', methods=['DELETE'])
def api_usuario_deletar(user_id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    if not is_admin():
        return jsonify({'error': 'Apenas administradores podem excluir usuários'}), 403
    try:
        if str(session.get('usuario_id')) == str(user_id):
            return jsonify({'error': 'Você não pode excluir sua própria conta'}), 400
        usuario = fetch_one("SELECT id_usuario FROM usuario WHERE id_usuario = %s", (user_id,))
        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        servicos_count = fetch_one("SELECT COUNT(*) as c FROM servico WHERE id_usuario_criador = %s", (user_id,))
        servicos = servicos_count['c'] if servicos_count else 0
        if servicos > 0:
            return jsonify({'error': f'Não é possível excluir. Usuário possui {servicos} serviço(s) vinculado(s).'}), 400
        rows = exec_write("DELETE FROM usuario WHERE id_usuario = %s", (user_id,))
        cache.clear()
        if rows == 0:
            return jsonify({'error': 'Erro ao excluir usuário'}), 500
        return jsonify({'success': True, 'message': 'Usuário excluído com sucesso!'}), 200
    except Exception as e:
        logger.exception("api_usuario_deletar failed")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/empresa/<int:id>/usuarios')
def api_usuarios_por_empresa(id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    try:
        usuarios = fetch_all("""
            SELECT id_usuario, nome, email, telefone, admin
            FROM usuario
            WHERE id_empresa_cliente_fk = %s
            ORDER BY nome ASC
        """, (id,))
        return jsonify({'success': True, 'usuarios': usuarios})
    except Exception as e:
        logger.exception("api_usuarios_por_empresa failed")
        return jsonify({'error': str(e)}), 500


