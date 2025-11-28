# automacao_servico.py
"""
Módulo de automação de serviços (SLA, resumos e vitrine avançada).

Fornece:
- Cálculo automático de SLA por serviço (no prazo, vence hoje, atrasado).
- Resumo por categoria (total, abertos, concluídos, urgentes, atrasados).
- Resumo por empresa (total, abertos, concluídos, atrasados).
- Visão de "saúde" geral dos serviços para dashboards.
"""

from flask import Blueprint, jsonify, request, session
from datetime import date
from typing import Optional, Dict, Any, List
import logging

from mysql.connector import errors as mysql_errors

logger = logging.getLogger("igech")

automacao_servico_bp = Blueprint(
    "automacao_servico",
    __name__,
    url_prefix="/api/automacao/servicos",
)


def _get_conn():
    """
    Importa get_conn (ou getconn) do app apenas em tempo de execução
    para evitar import circular.
    """
    try:
        from app import get_conn  # nome usado na versão mais nova [attached_file:96]
        return get_conn()
    except ImportError:
        # fallback se sua função ainda se chamar getconn
        from app import getconn  # type: ignore
        return getconn()


# ========== FUNÇÕES AUXILIARES DE SLA ==========

def calcular_sla_servico_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calcula o SLA de um serviço baseado em prazo_estimado e status.

    Args:
        row (dict): Deve conter 'status' e 'prazo_estimado' (ou 'prazo').

    Returns:
        dict:
            {
                "sla_status": "no_prazo" | "vence_hoje" | "atrasado" | "sem_prazo" | "concluido",
                "dias_atraso": int | None,
                "dias_restantes": int | None
            }
    """
    status = (row.get("status") or "").lower()
    prazo = row.get("prazo_estimado") or row.get("prazo")
    hoje = date.today()

    if status == "concluida":
        return {
            "sla_status": "concluido",
            "dias_atraso": None,
            "dias_restantes": None,
        }

    if not prazo:
        return {
            "sla_status": "sem_prazo",
            "dias_atraso": None,
            "dias_restantes": None,
        }

    if hasattr(prazo, "date"):
        prazo_date = prazo.date()
    else:
        prazo_date = prazo

    delta = (prazo_date - hoje).days

    if delta > 0:
        return {
            "sla_status": "no_prazo",
            "dias_atraso": 0,
            "dias_restantes": delta,
        }
    elif delta == 0:
        return {
            "sla_status": "vence_hoje",
            "dias_atraso": 0,
            "dias_restantes": 0,
        }
    else:
        return {
            "sla_status": "atrasado",
            "dias_atraso": abs(delta),
            "dias_restantes": 0,
        }


# ========== CLASSE DE SERVIÇO ==========

class AutomacaoServicoService:
    """
    Camada de serviço para automações relacionadas a serviços.
    Usa cursor direto, sem depender de fetch_all/fetch_one do app.
    """

    def __init__(self, conn):
        self.conn = conn
        self.cursor = conn.cursor(dictionary=True)

    # ---- Resumo por categoria ----

    def resumo_por_categoria(
        self,
        user_id: Optional[int],
        admin: bool,
    ) -> List[Dict[str, Any]]:
        """
        Gera resumo de serviços por categoria.

        Baseia-se na tabela servico com campos: categoria, status, prioridade, id_usuario_criador. [attached_file:99]
        """
        try:
            if admin:
                sql = """
                    SELECT
                        COALESCE(categoria, 'Hardware') AS categoria,
                        COUNT(*) AS total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS abertos,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(CASE WHEN prioridade = 'urgente' THEN 1 ELSE 0 END) AS urgentes,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados
                    FROM servico
                    GROUP BY categoria
                    ORDER BY categoria
                """
                params = None
            else:
                sql = """
                    SELECT
                        COALESCE(categoria, 'Hardware') AS categoria,
                        COUNT(*) AS total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS abertos,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(CASE WHEN prioridade = 'urgente' THEN 1 ELSE 0 END) AS urgentes,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados
                    FROM servico
                    WHERE id_usuario_criador = %s
                    GROUP BY categoria
                    ORDER BY categoria
                """
                params = (user_id,)

            self.cursor.execute(sql, params)
            vitrine = self.cursor.fetchall() or []

            categorias_padrao = ["Hardware", "Software", "Redes", "Suporte"]
            vitrine_dict = {v["categoria"]: v for v in vitrine}
            resultado: List[Dict[str, Any]] = []

            for cat in categorias_padrao:
                if cat in vitrine_dict:
                    resultado.append(vitrine_dict[cat])
                else:
                    resultado.append(
                        {
                            "categoria": cat,
                            "total": 0,
                            "abertos": 0,
                            "concluidos": 0,
                            "urgentes": 0,
                            "atrasados": 0,
                        }
                    )

            return resultado
        except mysql_errors.Error as db_err:
            logger.exception("Erro em resumo_por_categoria: %s", db_err)
            return []

    # ---- Resumo por empresa ----

    def resumo_por_empresa(
        self,
        user_id: Optional[int],
        admin: bool,
    ) -> List[Dict[str, Any]]:
        """
        Gera resumo de serviços por empresa (empresa_cliente). [attached_file:99]
        """
        try:
            if admin:
                sql = """
                    SELECT
                        ec.id_empresa_cliente AS id_empresa,
                        ec.nome AS empresa,
                        COUNT(*) AS total,
                        SUM(CASE WHEN s.status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS abertos,
                        SUM(CASE WHEN s.status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(
                            CASE
                                WHEN s.status != 'concluida'
                                     AND s.prazo_estimado IS NOT NULL
                                     AND DATE(s.prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    GROUP BY ec.id_empresa_cliente, ec.nome
                    ORDER BY ec.nome
                """
                params = None
            else:
                sql = """
                    SELECT
                        ec.id_empresa_cliente AS id_empresa,
                        ec.nome AS empresa,
                        COUNT(*) AS total,
                        SUM(CASE WHEN s.status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS abertos,
                        SUM(CASE WHEN s.status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(
                            CASE
                                WHEN s.status != 'concluida'
                                     AND s.prazo_estimado IS NOT NULL
                                     AND DATE(s.prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados
                    FROM servico s
                    JOIN empresa_cliente ec ON s.id_empresa_cliente_fk = ec.id_empresa_cliente
                    WHERE s.id_usuario_criador = %s
                    GROUP BY ec.id_empresa_cliente, ec.nome
                    ORDER BY ec.nome
                """
                params = (user_id,)

            self.cursor.execute(sql, params)
            return self.cursor.fetchall() or []
        except mysql_errors.Error as db_err:
            logger.exception("Erro em resumo_por_empresa: %s", db_err)
            return []

    # ---- Saúde geral do portfólio de serviços ----

    def sla_health(
        self,
        user_id: Optional[int],
        admin: bool,
    ) -> Dict[str, Any]:
        """
        Calcula indicadores globais de SLA (para cards de dashboard).
        """
        try:
            if admin:
                sql = """
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS em_andamento,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) >= CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS no_prazo
                    FROM servico
                """
                params = None
            else:
                sql = """
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN status IN ('aberta', 'em andamento') THEN 1 ELSE 0 END) AS em_andamento,
                        SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidos,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) < CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS atrasados,
                        SUM(
                            CASE
                                WHEN status != 'concluida'
                                     AND prazo_estimado IS NOT NULL
                                     AND DATE(prazo_estimado) >= CURDATE()
                                THEN 1 ELSE 0
                            END
                        ) AS no_prazo
                    FROM servico
                    WHERE id_usuario_criador = %s
                """
                params = (user_id,)

            self.cursor.execute(sql, params)
            r = self.cursor.fetchone() or {}
            total = int(r.get("total") or 0)
            atrasados = int(r.get("atrasados") or 0)
            em_andamento = int(r.get("em_andamento") or 0)
            concluidos = int(r.get("concluidos") or 0)
            no_prazo = int(r.get("no_prazo") or 0)

            pct_atrasados = 0.0
            if em_andamento > 0:
                pct_atrasados = round((atrasados / em_andamento) * 100.0, 1)

            return {
                "total": total,
                "em_andamento": em_andamento,
                "concluidos": concluidos,
                "atrasados": atrasados,
                "no_prazo": no_prazo,
                "pct_atrasados": pct_atrasados,
            }
        except mysql_errors.Error as db_err:
            logger.exception("Erro em sla_health: %s", db_err)
            return {
                "total": 0,
                "em_andamento": 0,
                "concluidos": 0,
                "atrasados": 0,
                "no_prazo": 0,
                "pct_atrasados": 0.0,
            }


# ========== "CACHE" SIMPLES (SEM DECORATOR) ==========

def _get_user_context() -> (Optional[int], bool):
    """
    Lê id do usuário e se é admin a partir da sessão.
    Usa mesma lógica de is_admin() (session['admin']) do app. [attached_file:96]
    """
    user_id = session.get("usuario_id")
    admin = bool(session.get("admin", False))
    return user_id, admin


def _resumo_categoria_cached(user_id: Optional[int], admin: bool) -> List[Dict[str, Any]]:
    conn = None
    try:
        conn = _get_conn()
        service = AutomacaoServicoService(conn)
        return service.resumo_por_categoria(user_id=user_id, admin=admin)
    except Exception as exc:
        logger.exception("Erro no resumo_categoria_cached: %s", exc)
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _resumo_empresas_cached(user_id: Optional[int], admin: bool) -> List[Dict[str, Any]]:
    conn = None
    try:
        conn = _get_conn()
        service = AutomacaoServicoService(conn)
        return service.resumo_por_empresa(user_id=user_id, admin=admin)
    except Exception as exc:
        logger.exception("Erro no resumo_empresas_cached: %s", exc)
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _sla_health_cached(user_id: Optional[int], admin: bool) -> Dict[str, Any]:
    conn = None
    try:
        conn = _get_conn()
        service = AutomacaoServicoService(conn)
        return service.sla_health(user_id=user_id, admin=admin)
    except Exception as exc:
        logger.exception("Erro no sla_health_cached: %s", exc)
        return {
            "total": 0,
            "em_andamento": 0,
            "concluidos": 0,
            "atrasados": 0,
            "no_prazo": 0,
            "pct_atrasados": 0.0,
        }
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ========== ENDPOINTS DE API ==========

@automacao_servico_bp.route("/resumo-categorias", methods=["GET"])
def api_resumo_categorias():
    user_id, admin = _get_user_context()
    if not user_id:
        return jsonify({"error": "Nao autenticado"}), 401

    try:
        data = _resumo_categoria_cached(user_id=user_id, admin=admin)
        return jsonify({"success": True, "admin": admin, "categorias": data}), 200
    except Exception as exc:
        logger.exception("Erro em /resumo-categorias: %s", exc)
        return jsonify({"success": False, "error": "internal_error"}), 500


@automacao_servico_bp.route("/resumo-empresas", methods=["GET"])
def api_resumo_empresas():
    user_id, admin = _get_user_context()
    if not user_id:
        return jsonify({"error": "Nao autenticado"}), 401

    try:
        data = _resumo_empresas_cached(user_id=user_id, admin=admin)
        return jsonify({"success": True, "admin": admin, "empresas": data}), 200
    except Exception as exc:
        logger.exception("Erro em /resumo-empresas: %s", exc)
        return jsonify({"success": False, "error": "internal_error"}), 500


@automacao_servico_bp.route("/sla-health", methods=["GET"])
def api_sla_health():
    user_id, admin = _get_user_context()
    if not user_id:
        return jsonify({"error": "Nao autenticado"}), 401

    try:
        metrics = _sla_health_cached(user_id=user_id, admin=admin)
        return jsonify({"success": True, "admin": admin, "metrics": metrics}), 200
    except Exception as exc:
        logger.exception("Erro em /sla-health: %s", exc)
        return jsonify({"success": False, "error": "internal_error"}), 500


# ========== TESTE LOCAL ==========

if __name__ == "__main__":
    conn = _get_conn()
    service = AutomacaoServicoService(conn)
    print("Resumo categorias:", service.resumo_por_categoria(user_id=None, admin=True))
    print("SLA health:", service.sla_health(user_id=None, admin=True))
    conn.close()
