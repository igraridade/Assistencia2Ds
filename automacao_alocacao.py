
from flask import Blueprint, jsonify, request
from datetime import datetime, date
from functools import wraps
from typing import Optional, Dict, Any, List
import logging

from mysql.connector import errors as mysql_errors

logger = logging.getLogger("igech")  

automacao_bp = Blueprint("automacao", __name__, url_prefix="/api/automacao")


def _get_conn():
    """Importa get_conn do app apenas em tempo de execução (evita import circular)."""
    from app import get_conn  # import local [attached_file:96]
    return get_conn()


# ========== FUNÇÕES AUXILIARES PURAS ==========

def _dict_from_alocacao_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Converte uma linha de alocação atual para o dicionário padrão."""
    if not row:
        return None

    data_inicio = row.get("data_inicio_alocacao")
    if isinstance(data_inicio, str):
        try:
            data_inicio_dt = datetime.fromisoformat(data_inicio)
        except ValueError:
            data_inicio_dt = None
    else:
        data_inicio_dt = data_inicio

    return {
        "protocolo": row.get("protocolo_fk"),
        "empresa_nome": row.get("empresa_nome"),
        "empresa_id": row.get("id_empresa_cliente"),
        "data_inicio": data_inicio_dt,
        "dias_alocado": row.get("dias_alocado"),
        "endereco_atendimento": row.get("endereco_atendimento"),
    }


def obter_alocacao_atual(
    id_tecnico: int,
    cursor,
) -> Optional[Dict[str, Any]]:
    """
    Retorna a alocação aberta mais recente do técnico.
    """
    sql = """
        SELECT
            a.protocolo_fk,
            ec.nome AS empresa_nome,
            ec.id_empresa_cliente,
            a.data_inicio_alocacao,
            DATEDIFF(CURDATE(), a.data_inicio_alocacao) AS dias_alocado,
            s.endereco_atendimento
        FROM alocacao_tecnico a
        JOIN servico s ON a.protocolo_fk = s.protocolo
        JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
        WHERE a.id_tecnico_fk = %s
          AND (a.data_fim_alocacao IS NULL OR a.data_fim_alocacao >= CURDATE())
        ORDER BY a.data_inicio_alocacao DESC
        LIMIT 1
    """
    cursor.execute(sql, (id_tecnico,))
    row = cursor.fetchone()
    return _dict_from_alocacao_row(row)


def calcular_status_tecnico(
    id_tecnico: int,
    cursor,
) -> Dict[str, Any]:
    """
    Calcula o status lógico do técnico baseado nas alocações e status cadastral.
    """
    cursor.execute(
        "SELECT status FROM tecnico WHERE id_tecnico = %s",
        (id_tecnico,),
    )
    row = cursor.fetchone()

    if not row:
        return {
            "status_codigo": 0,
            "status_texto": "inativo",
            "alocacao_atual": None,
        }

    status_cadastral = row.get("status", 0)

    if not status_cadastral:
        return {
            "status_codigo": 0,
            "status_texto": "inativo",
            "alocacao_atual": None,
        }

    alocacao_atual = obter_alocacao_atual(id_tecnico, cursor)

    if alocacao_atual:
        return {
            "status_codigo": 2,
            "status_texto": "alocado",
            "alocacao_atual": alocacao_atual,
        }

    return {
        "status_codigo": 1,
        "status_texto": "disponivel",
        "alocacao_atual": None,
    }


def recomendar_tecnico_por_categoria(
    categoria: str,
    cursor,
) -> Optional[Dict[str, Any]]:
    """
    Seleciona o melhor técnico para uma categoria textual (Hardware/Software/Redes/Suporte).

    Critérios:
    1. Técnicos disponíveis (sem alocação aberta).
    2. Status ativo.
    3. Maior número de serviços concluídos na categoria.
    4. Melhor nota média de avaliação.
    5. Menor preço/hora.
    """
    sql = """
        SELECT
            t.id_tecnico,
            t.nome,
            t.especialidade,
            t.nivel_experiencia,
            t.preco_por_hora,
            t.status,
            COALESCE(SUM(
                CASE
                    WHEN s.status = 'concluida'
                         AND COALESCE(s.categoria, 'Hardware') = %s
                    THEN 1 ELSE 0
                END
            ), 0) AS servicos_concluidos,
            COALESCE(AVG(av.nota), 0) AS nota_media,
            COUNT(DISTINCT av.id_avaliacao) AS total_avaliacoes,
            MAX(
                CASE
                    WHEN a.data_fim_alocacao IS NULL
                         OR a.data_fim_alocacao >= CURDATE()
                    THEN 1 ELSE 0
                END
            ) AS tem_alocacao_aberta
        FROM tecnico t
        LEFT JOIN alocacao_tecnico a
            ON a.id_tecnico_fk = t.id_tecnico
        LEFT JOIN servico s
            ON s.protocolo = a.protocolo_fk
        LEFT JOIN avaliacao av
            ON av.id_tecnico_fk = t.id_tecnico
        WHERE t.status = 1
        GROUP BY
            t.id_tecnico,
            t.nome,
            t.especialidade,
            t.nivel_experiencia,
            t.preco_por_hora,
            t.status
    """
    cursor.execute(sql, (categoria,))
    rows = cursor.fetchall() or []

    if not rows:
        return None

    disponiveis: List[Dict[str, Any]] = []
    ocupados: List[Dict[str, Any]] = []

    for r in rows:
        if r.get("tem_alocacao_aberta"):
            ocupados.append(r)
        else:
            disponiveis.append(r)

    candidatos = disponiveis if disponiveis else ocupados

    def _ordenacao(tec: Dict[str, Any]):
        return (
            -int(tec.get("servicos_concluidos") or 0),
            -float(tec.get("nota_media") or 0.0),
            float(tec.get("preco_por_hora") or 999999.0),
            int(tec.get("id_tecnico") or 0),
        )

    candidatos.sort(key=_ordenacao)
    best = candidatos[0]

    return {
        "id": best.get("id_tecnico"),
        "nome": best.get("nome"),
        "especialidade": best.get("especialidade"),
        "nivelexperiencia": best.get("nivel_experiencia"),
        "precohora": float(best.get("preco_por_hora") or 0.0),
        "servicos_concluidos": int(best.get("servicos_concluidos") or 0),
        "nota_media": round(float(best.get("nota_media") or 0.0), 1),
        "total_avaliacoes": int(best.get("total_avaliacoes") or 0),
        "disponivel": not bool(best.get("tem_alocacao_aberta")),
    }


# ========== HOOKS E DECORATORS ==========

def atualizar_empresa_tecnico_hook(
    id_tecnico: int,
    id_alocacao: int,
    cursor=None,
    conexao=None,
) -> None:
    """
    Hook chamado após criar ou concluir uma alocação.
    """
    own_conn = False
    own_cursor = False

    try:
        if conexao is None:
            conexao = _get_conn()
            own_conn = True
        if cursor is None:
            cursor = conexao.cursor(dictionary=True)
            own_cursor = True

        # Verifica se a alocação está aberta ou concluída
        cursor.execute(
            """
            SELECT
                a.id_tecnico_fk,
                a.data_fim_alocacao,
                a.protocolo_fk,
                s.id_empresa_cliente_fk
            FROM alocacao_tecnico a
            JOIN servico s ON s.protocolo = a.protocolo_fk
            WHERE a.id_alocacao_tecnico = %s
            """,
            (id_alocacao,),
        )
        aloc = cursor.fetchone()
        if not aloc:
            return

        data_fim = aloc.get("data_fim_alocacao")
        id_empresa_atual = aloc.get("id_empresa_cliente_fk")

        if data_fim is None:
            # criação de alocação (aberta)
            cursor.execute(
                """
                UPDATE tecnico
                SET id_empresa_cliente_fk = %s
                WHERE id_tecnico = %s
                """,
                (id_empresa_atual, id_tecnico),
            )
        else:
            # conclusão: busca outra alocação aberta
            cursor.execute(
                """
                SELECT
                    a.id_alocacao_tecnico,
                    a.protocolo_fk,
                    a.data_inicio_alocacao,
                    s.id_empresa_cliente_fk
                FROM alocacao_tecnico a
                JOIN servico s ON s.protocolo = a.protocolo_fk
                WHERE a.id_tecnico_fk = %s
                  AND (a.data_fim_alocacao IS NULL OR a.data_fim_alocacao >= CURDATE())
                ORDER BY a.data_inicio_alocacao DESC
                LIMIT 1
                """,
                (id_tecnico,),
            )
            prox = cursor.fetchone()
            if prox:
                prox_empresa = prox.get("id_empresa_cliente_fk")
                cursor.execute(
                    """
                    UPDATE tecnico
                    SET id_empresa_cliente_fk = %s
                    WHERE id_tecnico = %s
                    """,
                    (prox_empresa, id_tecnico),
                )
            else:
                cursor.execute(
                    """
                    UPDATE tecnico
                    SET id_empresa_cliente_fk = NULL
                    WHERE id_tecnico = %s
                    """,
                    (id_tecnico,),
                )

        if own_conn:
            conexao.commit()

    except mysql_errors.Error as db_err:
        logger.exception("Erro no hook de atualização de empresa do técnico: %s", db_err)
        if own_conn and conexao:
            conexao.rollback()
    except Exception as exc:
        logger.exception("Erro inesperado no hook de atualização de empresa: %s", exc)
        if own_conn and conexao:
            conexao.rollback()
    finally:
        if own_cursor and cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if own_conn and conexao:
            try:
                conexao.close()
            except Exception:
                pass


def atualizar_empresa_atual(func):
    """Decorator opcional para rotas que criam/alteram alocações."""

    @wraps(func)
    def wrapper(*args, **kwargs):
        resp = func(*args, **kwargs)
        try:
            if hasattr(resp, "get_json"):
                data = resp.get_json(silent=True) or {}
            else:
                data = {}

            id_tecnico = data.get("id_tecnico") or data.get("idtecnico")
            id_alocacao = data.get("id_alocacao") or data.get("idalocacao")

            if id_tecnico and id_alocacao:
                atualizar_empresa_tecnico_hook(int(id_tecnico), int(id_alocacao))
        except Exception as exc:
            logger.exception("Erro no decorator atualizar_empresa_atual: %s", exc)

        return resp

    return wrapper


# ========== CLASSE DE SERVIÇO ==========

class AutomacaoAlocacaoService:
    """Camada de serviço para lógica de negócio relacionada às alocações."""

    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor(dictionary=True)

    def obter_resumo_tecnicos(self) -> Dict[str, Any]:
        """
        Gera resumo de técnicos para dashboards em tempo quase real.
        """
        resumo_sql = """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS ativos,
                SUM(CASE WHEN t.status = 0 THEN 1 ELSE 0 END) AS inativos
            FROM tecnico t
        """
        self.cursor.execute(resumo_sql)
        r = self.cursor.fetchone() or {}
        total = int(r.get("total") or 0)
        ativos = int(r.get("ativos") or 0)
        inativos = int(r.get("inativos") or 0)

        detalhes_sql = """
            SELECT
                t.id_tecnico AS id,
                t.nome,
                t.status,
                a.protocolo_fk AS protocolo_atual,
                a.data_inicio_alocacao AS data_inicio,
                DATEDIFF(CURDATE(), a.data_inicio_alocacao) AS dias_alocado,
                ec.nome AS empresa_atual
            FROM tecnico t
            LEFT JOIN alocacao_tecnico a
                ON a.id_tecnico_fk = t.id_tecnico
               AND a.id_alocacao_tecnico = (
                    SELECT at2.id_alocacao_tecnico
                    FROM alocacao_tecnico at2
                    WHERE at2.id_tecnico_fk = t.id_tecnico
                      AND (at2.data_fim_alocacao IS NULL OR at2.data_fim_alocacao >= CURDATE())
                    ORDER BY at2.data_inicio_alocacao DESC
                    LIMIT 1
               )
            LEFT JOIN servico s
                ON s.protocolo = a.protocolo_fk
            LEFT JOIN empresa_cliente ec
                ON ec.id_empresa_cliente = s.id_empresa_cliente_fk
            ORDER BY t.nome
        """
        self.cursor.execute(detalhes_sql)
        rows = self.cursor.fetchall() or []

        detalhes: List[Dict[str, Any]] = []
        alocados = 0

        for r in rows:
            status_cadastral = r.get("status", 0)
            protocolo_atual = r.get("protocolo_atual")
            status_texto = "inativo"
            status_codigo = 0

            if status_cadastral:
                if protocolo_atual:
                    status_codigo = 2
                    status_texto = "alocado"
                    alocados += 1
                else:
                    status_codigo = 1
                    status_texto = "disponivel"

            detalhes.append(
                {
                    "id": r.get("id"),
                    "nome": r.get("nome"),
                    "status_cadastral": int(status_cadastral or 0),
                    "status_calculado": status_texto,
                    "status_codigo": status_codigo,
                    "empresa_atual": r.get("empresa_atual"),
                    "protocolo_atual": protocolo_atual,
                    "desde": r.get("data_inicio"),
                    "dias_alocado": r.get("dias_alocado"),
                }
            )

        disponiveis = max(ativos - alocados, 0)

        return {
            "total": total,
            "ativos": ativos,
            "inativos": inativos,
            "alocados": alocados,
            "disponiveis": disponiveis,
            "detalhes": detalhes,
        }

    def recomendar_tecnico(self, categoria: str) -> Optional[Dict[str, Any]]:
        """Wrapper para recomendação de técnico por categoria textual."""
        return recomendar_tecnico_por_categoria(categoria, self.cursor)

    def verificar_alocacoes_prolongadas(
        self,
        dias_limite: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Identifica técnicos alocados há mais de X dias.
        """
        sql = """
            SELECT
                t.id_tecnico,
                t.nome AS nome_tecnico,
                ec.nome AS empresa_nome,
                a.protocolo_fk,
                a.data_inicio_alocacao,
                DATEDIFF(CURDATE(), a.data_inicio_alocacao) AS dias_alocado
            FROM alocacao_tecnico a
            JOIN tecnico t ON t.id_tecnico = a.id_tecnico_fk
            JOIN servico s ON s.protocolo = a.protocolo_fk
            JOIN empresa_cliente ec ON ec.id_empresa_cliente = s.id_empresa_cliente_fk
            WHERE (a.data_fim_alocacao IS NULL OR a.data_fim_alocacao >= CURDATE())
              AND DATEDIFF(CURDATE(), a.data_inicio_alocacao) >= %s
            ORDER BY dias_alocado DESC
        """
        self.cursor.execute(sql, (dias_limite,))
        return self.cursor.fetchall() or []

    def prever_tecnicos_disponiveis(self, data_futura: date) -> int:
        """
        Estima quantos técnicos estarão disponíveis em uma data futura.
        """
        self.cursor.execute(
            "SELECT COUNT(*) AS total_ativos FROM tecnico WHERE status = 1"
        )
        row = self.cursor.fetchone() or {}
        total_ativos = int(row.get("total_ativos") or 0)

        sql_ocupados = """
            SELECT COUNT(DISTINCT a.id_tecnico_fk) AS ocupados
            FROM alocacao_tecnico a
            WHERE
                DATE(a.data_inicio_alocacao) <= %s
                AND (a.data_fim_alocacao IS NULL OR DATE(a.data_fim_alocacao) >= %s)
        """
        self.cursor.execute(sql_ocupados, (data_futura, data_futura))
        row2 = self.cursor.fetchone() or {}
        ocupados = int(row2.get("ocupados") or 0)

        disponiveis = max(total_ativos - ocupados, 0)
        return disponiveis

    def sugerir_redistribuicao(self) -> List[Dict[str, Any]]:
        """
        Analisa distribuição de carga entre técnicos e sugere realocações.
        """
        sql = """
            SELECT
                t.id_tecnico,
                t.nome,
                COUNT(a.id_alocacao_tecnico) AS alocacoes_abertas
            FROM tecnico t
            JOIN alocacao_tecnico a
                ON a.id_tecnico_fk = t.id_tecnico
            WHERE a.data_fim_alocacao IS NULL OR a.data_fim_alocacao >= CURDATE()
            GROUP BY t.id_tecnico, t.nome
            HAVING COUNT(a.id_alocacao_tecnico) > 1
            ORDER BY alocacoes_abertas DESC, t.nome
        """
        self.cursor.execute(sql)
        return self.cursor.fetchall() or []


# ========== RESUMO (SEM CACHE DECORATOR) ==========

def obter_resumo_cached() -> Dict[str, Any]:
    """Versão simples (sem decorator de cache) para evitar import circular."""
    conn = None
    try:
        conn = _get_conn()
        service = AutomacaoAlocacaoService(conn)
        return service.obter_resumo_tecnicos()
    except Exception as exc:
        logger.exception("Erro ao obter resumo de técnicos: %s", exc)
        return {
            "total": 0,
            "ativos": 0,
            "inativos": 0,
            "alocados": 0,
            "disponiveis": 0,
            "detalhes": [],
        }
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ========== ENDPOINTS DE API ==========

@automacao_bp.route("/tecnicos-resumo", methods=["GET"])
def obter_resumo_tecnicos():
    """Endpoint para dashboard com contadores automáticos."""
    try:
        data = obter_resumo_cached()
        return jsonify(data), 200
    except Exception as exc:
        logger.exception("Erro na API /tecnicos-resumo: %s", exc)
        return jsonify({"error": "internal_error"}), 500


@automacao_bp.route("/sugerir-tecnico", methods=["POST"])
def sugerir_tecnico():
    """
    Endpoint para ser chamado no contratar_servico.html.

    Body esperado:
        {
            "categoria": "Hardware"
        }
    """
    payload = request.get_json(silent=True) or {}
    categoria = (payload.get("categoria") or "Hardware").strip()

    conn = None
    try:
        conn = _get_conn()
        service = AutomacaoAlocacaoService(conn)

        best = service.recomendar_tecnico(categoria)
        if not best:
            return jsonify({"tecnico_sugerido": None, "alternativas": []}), 200

        cur = service.cursor
        candidatos_sql = """
            SELECT
                t.id_tecnico,
                t.nome,
                t.especialidade,
                t.nivel_experiencia,
                t.preco_por_hora,
                COALESCE(SUM(
                    CASE
                        WHEN s.status = 'concluida'
                             AND COALESCE(s.categoria, 'Hardware') = %s
                        THEN 1 ELSE 0
                    END
                ), 0) AS servicos_concluidos,
                COALESCE(AVG(av.nota), 0) AS nota_media,
                COUNT(DISTINCT av.id_avaliacao) AS total_avaliacoes,
                MAX(
                    CASE
                        WHEN a.data_fim_alocacao IS NULL
                             OR a.data_fim_alocacao >= CURDATE()
                        THEN 1 ELSE 0
                    END
                ) AS tem_alocacao_aberta
            FROM tecnico t
            LEFT JOIN alocacao_tecnico a
                ON a.id_tecnico_fk = t.id_tecnico
            LEFT JOIN servico s
                ON s.protocolo = a.protocolo_fk
            LEFT JOIN avaliacao av
                ON av.id_tecnico_fk = t.id_tecnico
            WHERE t.status = 1
            GROUP BY
                t.id_tecnico,
                t.nome,
                t.especialidade,
                t.nivel_experiencia,
                t.preco_por_hora
        """
        cur.execute(candidatos_sql, (categoria,))
        all_rows = cur.fetchall() or []

        def _ordenacao(tec: Dict[str, Any]):
            return (
                -int(tec.get("servicos_concluidos") or 0),
                -float(tec.get("nota_media") or 0.0),
                float(tec.get("preco_por_hora") or 999999.0),
                int(tec.get("id_tecnico") or 0),
            )

        all_rows.sort(key=_ordenacao)
        top3 = all_rows[:3]

        alternativas = []
        for r in top3:
            alternativas.append(
                {
                    "id": r.get("id_tecnico"),
                    "nome": r.get("nome"),
                    "especialidade": r.get("especialidade"),
                    "nivelexperiencia": r.get("nivel_experiencia"),
                    "preco_hora": float(r.get("preco_por_hora") or 0.0),
                    "servicos_concluidos": int(r.get("servicos_concluidos") or 0),
                    "nota_media": round(float(r.get("nota_media") or 0.0), 1),
                    "total_avaliacoes": int(r.get("total_avaliacoes") or 0),
                    "disponivel": not bool(r.get("tem_alocacao_aberta")),
                }
            )

        best_payload = {
            **best,
            "experiencia": f"{best['servicos_concluidos']} serviços concluídos",
        }
        if "precohora" in best_payload:
            best_payload["preco_hora"] = best_payload.pop("precohora")

        resposta = {
            "tecnico_sugerido": best_payload,
            "alternativas": alternativas,
            "auto_alocar_suportado": False,
        }
        return jsonify(resposta), 200

    except mysql_errors.Error as db_err:
        logger.exception("Erro no banco ao sugerir técnico: %s", db_err)
        return jsonify({"error": "db_error"}), 500
    except Exception as exc:
        logger.exception("Erro inesperado em /sugerir-tecnico: %s", exc)
        return jsonify({"error": "internal_error"}), 500
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ========== TESTE LOCAL ==========

if __name__ == "__main__":
    conn = _get_conn()
    service = AutomacaoAlocacaoService(conn)
    hoje = date.today()
    print("Resumo técnicos:", service.obter_resumo_tecnicos())
    print("Técnicos disponíveis daqui 7 dias:", service.prever_tecnicos_disponiveis(hoje))
    conn.close()
