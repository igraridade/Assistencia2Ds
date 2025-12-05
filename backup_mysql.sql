-- MySQL dump 10.13  Distrib 8.0.40, for Linux (x86_64)
--
-- Host: IGECHTECH.mysql.pythonanywhere-services.com    Database: IGECHTECH$Assistencia
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alocacao_tecnico`
--

DROP TABLE IF EXISTS `alocacao_tecnico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alocacao_tecnico` (
  `id_alocacao_tecnico` int NOT NULL AUTO_INCREMENT,
  `data_inicio_alocacao` date NOT NULL,
  `data_fim_alocacao` datetime DEFAULT NULL,
  `id_tecnico_fk` int DEFAULT NULL,
  `protocolo_fk` int DEFAULT NULL,
  PRIMARY KEY (`id_alocacao_tecnico`),
  KEY `protocolo_fk` (`protocolo_fk`),
  KEY `alocacao_tecnico_ibfk_1` (`id_tecnico_fk`),
  CONSTRAINT `alocacao_tecnico_ibfk_1` FOREIGN KEY (`id_tecnico_fk`) REFERENCES `tecnico` (`id_tecnico`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alocacao_tecnico_ibfk_2` FOREIGN KEY (`protocolo_fk`) REFERENCES `servico` (`protocolo`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alocacao_tecnico`
--

LOCK TABLES `alocacao_tecnico` WRITE;
/*!40000 ALTER TABLE `alocacao_tecnico` DISABLE KEYS */;
INSERT INTO `alocacao_tecnico` VALUES (80,'2025-11-01','2025-11-01 09:00:00',20,12510),(81,'2025-11-02','2025-11-02 10:00:00',21,12511),(82,'2025-11-03','2025-11-03 11:00:00',22,12512),(83,'2025-11-04','2025-11-04 14:00:00',23,12513),(84,'2025-11-05','2025-11-05 15:00:00',24,12514),(85,'2025-11-06','2025-11-06 16:00:00',25,12515),(86,'2025-11-07','2025-11-07 09:30:00',26,12516),(87,'2025-11-08','2025-11-08 10:30:00',27,12517),(88,'2025-11-09','2025-11-09 14:30:00',28,12518),(89,'2025-11-10','2025-11-10 15:30:00',29,12519),(90,'2025-11-11','2025-11-11 09:00:00',30,12520),(91,'2025-11-12','2025-11-12 10:00:00',31,12521),(92,'2025-11-13','2025-11-13 11:00:00',32,12522),(93,'2025-11-14','2025-11-14 14:00:00',33,12523),(94,'2025-11-15','2025-11-15 15:00:00',34,12524),(95,'2025-11-16','2025-11-16 16:00:00',35,12525),(96,'2025-11-17','2025-11-17 09:30:00',36,12526),(97,'2025-11-18','2025-11-18 10:30:00',37,12527),(98,'2025-11-19','2025-11-19 14:30:00',38,12528),(99,'2025-11-20','2025-11-20 15:30:00',39,12529),(100,'2025-11-21','2025-11-21 09:00:00',40,12530),(101,'2025-11-22','2025-11-22 10:00:00',41,12531),(102,'2025-11-23','2025-11-23 11:00:00',42,12532),(103,'2025-11-24','2025-11-24 14:00:00',43,12533),(104,'2025-11-25','2025-11-25 15:00:00',44,12534),(105,'2025-11-26','2025-11-26 16:00:00',45,12535),(106,'2025-11-27','2025-11-27 09:30:00',46,12536),(107,'2025-11-28','2025-11-28 10:30:00',47,12537),(108,'2025-11-29','2025-11-29 14:30:00',48,12538),(109,'2025-11-30','2025-11-30 15:30:00',49,12539);
/*!40000 ALTER TABLE `alocacao_tecnico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `avaliacao`
--

DROP TABLE IF EXISTS `avaliacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avaliacao` (
  `id_avaliacao` int NOT NULL AUTO_INCREMENT,
  `id_tecnico_fk` int NOT NULL,
  `protocolo_fk` int NOT NULL,
  `id_usuario_fk` int NOT NULL,
  `nota` decimal(2,1) NOT NULL,
  `comentario` text,
  `data_avaliacao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_avaliacao`),
  UNIQUE KEY `unique_avaliacao` (`protocolo_fk`,`id_usuario_fk`),
  KEY `id_tecnico_fk` (`id_tecnico_fk`),
  KEY `id_usuario_fk` (`id_usuario_fk`),
  CONSTRAINT `avaliacao_ibfk_1` FOREIGN KEY (`id_tecnico_fk`) REFERENCES `tecnico` (`id_tecnico`),
  CONSTRAINT `avaliacao_ibfk_2` FOREIGN KEY (`protocolo_fk`) REFERENCES `servico` (`protocolo`),
  CONSTRAINT `avaliacao_ibfk_3` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `avaliacao_chk_1` CHECK (((`nota` >= 0) and (`nota` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `avaliacao`
--

LOCK TABLES `avaliacao` WRITE;
/*!40000 ALTER TABLE `avaliacao` DISABLE KEYS */;
/*!40000 ALTER TABLE `avaliacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresa_cliente`
--

DROP TABLE IF EXISTS `empresa_cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresa_cliente` (
  `id_empresa_cliente` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  `CNPJ` char(14) NOT NULL,
  `telefone` char(10) NOT NULL,
  `email` varchar(255) NOT NULL,
  `id_logradouro_fk` int DEFAULT NULL,
  `data_cadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_empresa_cliente`),
  UNIQUE KEY `CNPJ` (`CNPJ`),
  KEY `id_logradouro_fk` (`id_logradouro_fk`),
  KEY `idx_empresa_data_cadastro` (`data_cadastro`),
  CONSTRAINT `empresa_cliente_ibfk_1` FOREIGN KEY (`id_logradouro_fk`) REFERENCES `logradouro` (`id_logradouro`)
) ENGINE=InnoDB AUTO_INCREMENT=113 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa_cliente`
--

LOCK TABLES `empresa_cliente` WRITE;
/*!40000 ALTER TABLE `empresa_cliente` DISABLE KEYS */;
INSERT INTO `empresa_cliente` VALUES (80,'GOOGLE BRASIL INTERNET LTDA','06990590000123','1130000001','contato@google.com',34,'2025-12-05 01:30:25'),(81,'MICROSOFT INFORMATICA LTDA','60316817000103','1130000002','contato@microsoft.com',NULL,'2025-12-05 01:30:25'),(82,'IBM BRASIL-IND MAQUINAS E SERVICOS LTDA','33372251003333','1130000003','contato@ibm.com',36,'2025-12-05 01:30:25'),(83,'ORACLE DO BRASIL SISTEMAS LTDA','59456277000176','1130000004','contato@oracle.com',NULL,'2025-12-05 01:30:25'),(84,'SAP BRASIL LTDA','74544297000192','1130000005','contato@sap.com',NULL,'2025-12-05 01:30:25'),(85,'TOTVS S.A.','53113791000122','1130000006','contato@totvs.com.br',NULL,'2025-12-05 01:30:25'),(86,'PAGSEGURO INTERNET INST DE PAGTO S.A.','08561701000101','1130000007','contato@pagseguro.com.br',NULL,'2025-12-05 01:30:25'),(87,'LOCAWEB SERVICOS DE INTERNET S.A.','02351877000152','1130000008','contato@locaweb.com.br',NULL,'2025-12-05 01:30:25'),(88,'AMAZON SERVICOS DE VAREJO DO BRASIL LTDA','15436940001339','1130000009','contato@amazon.com.br',27,'2025-12-05 01:30:25'),(89,'FACEBOOK SERVICOS ONLINE DO BRASIL LTDA','13347016000117','1130000010','contato@fb.com',33,'2025-12-05 01:30:25'),(90,'MERCADOLIVRE.COM ATIVIDADES DE INTERNET','03361252000134','1130000011','contato@mercadolivre.com',NULL,'2025-12-05 01:30:25'),(91,'NU PAGAMENTOS S.A.','18236120000158','1130000012','contato@nubank.com.br',NULL,'2025-12-05 01:30:25'),(92,'STONE INSTITUICAO DE PAGAMENTO S.A.','16501555000157','1130000013','contato@stone.com.br',NULL,'2025-12-05 01:30:25'),(93,'CIELO S.A. - INST DE PAGAMENTO','01027058000191','1130000014','contato@cielo.com.br',31,'2025-12-05 01:30:25'),(94,'LINX SISTEMAS E CONSULTORIA LTDA','54517628000198','1130000015','contato@linx.com.br',38,'2025-12-05 01:30:25'),(95,'IFOOD.COM AGENCIA DE REST ONLINE S.A.','14380200000121','1130000016','contato@ifood.com.br',37,'2025-12-05 01:30:25'),(96,'NETFLIX ENTRETENIMENTO BRASIL LTDA','13590585000199','1130000017','contato@netflix.com',NULL,'2025-12-05 01:30:25'),(97,'XP INVESTIMENTOS CCTVM S.A.','02332886000104','1130000018','contato@xpi.com.br',NULL,'2025-12-05 01:30:25'),(98,'MAGAZINE LUIZA S.A.','47960950000121','1637112000','contato@magazineluiza.com.br',NULL,'2025-12-05 01:30:25'),(99,'GRUPO CASAS BAHIA S.A.','33041260143518','1130000019','contato@casasbahia.com.br',35,'2025-12-05 01:30:25'),(100,'CI&T SOFTWARE S.A.','00609634000146','1930000020','contato@ciandt.com',30,'2025-12-05 01:30:25'),(101,'AYTY CRM BPO TECNOLOGIA DA INFORMACAO','09511907000190','1130000021','contato@ayty.com.br',29,'2025-12-05 01:30:25'),(102,'PIPEFY S.A.','20216551000106','4130000022','contato@pipefy.com',NULL,'2025-12-05 01:30:25'),(103,'EBANX S.A.','13590316000116','4130000023','contato@ebanx.com',32,'2025-12-05 01:30:25'),(104,'NEON PAGAMENTOS S.A.','19906269000107','1130000024','contato@neon.com.br',NULL,'2025-12-05 01:30:25'),(105,'SENIOR SISTEMAS S.A.','00887786000105','4730000025','contato@senior.com.br',NULL,'2025-12-05 01:30:25'),(106,'TOTVS S.A. FILIAL JOINVILLE','53113791003067','4730000026','joinville@totvs.com.br',NULL,'2025-12-05 01:30:25'),(107,'PAGSEGURO INTERNET S.A. FILIAL SP','08561701004603','1130000027','sp@pagseguro.com.br',NULL,'2025-12-05 01:30:25'),(108,'LOCAWEB LWSA S.A. FILIAL SP','02351877001402','1130000028','sp@locaweb.com.br',39,'2025-12-05 01:30:25'),(109,'MERCADOLIVRE.COM ATIV INTERNET FILIAL','03361252000215','1130000029','sp@mercadolivre.com',NULL,'2025-12-05 01:30:25'),(112,'BANCO SANTANDER (BRASIL) S.A.','90400888000142','1140043535','cadastro.santander@targetlaw.com.br',40,'2025-12-05 02:54:38');
/*!40000 ALTER TABLE `empresa_cliente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `logradouro`
--

DROP TABLE IF EXISTS `logradouro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logradouro` (
  `id_logradouro` int NOT NULL AUTO_INCREMENT,
  `cep` char(8) NOT NULL,
  `estado` char(2) DEFAULT NULL,
  `cidade` varchar(100) NOT NULL,
  `logradouro` varchar(10) NOT NULL,
  `nome_logradouro` varchar(120) DEFAULT NULL,
  `numero` varchar(5) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_logradouro`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logradouro`
--

LOCK TABLES `logradouro` WRITE;
/*!40000 ALTER TABLE `logradouro` DISABLE KEYS */;
INSERT INTO `logradouro` VALUES (1,'08595856','SP','Itaquaquecetuba','Rua Belo J',NULL,'126',NULL,'Terra Prometida'),(2,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','231',NULL,'Terra Prometida'),(3,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','120',NULL,'Terra Prometida'),(4,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','150',NULL,'Terra Prometida'),(5,'08570320','SP','Itaquaquecetuba','Rua','Casemiro de Abreu','125',NULL,'Vila Maria Augusta'),(6,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','150',NULL,'Terra Prometida'),(7,'69911878','AC','Rio Branco','Rua','Frei Thiago','123',NULL,'Ayrton Senna'),(8,'32132132','PE','dcsadsaxd','Rua','fdsfdsfsdfsd','32131','sad','dsadsas'),(9,'69911878','AC','Rio Branco','Rua','Frei Thiago','69',NULL,'Ayrton Senna'),(10,'08570320','SP','Itaquaquecetuba','Rua','Casemiro de Abreu','125',NULL,'Vila Maria Augusta'),(11,'69907550','AC','Rio Branco','Travessa','Padre Thiago Padre','111','','Recanto dos Buritis'),(12,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(13,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(14,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(15,'03904070','SP','São Paulo','Rua','Felipe dos Santos Freire','S/N','','Jardim Tango'),(16,'04543011','SP','São Paulo','Avenida','Pres Juscelino Kubitschek','2041','Conj 281 Bloco a Cond Wtorre Jk','Vila Nova Conceicao'),(17,'04538133','SP','São Paulo','Avenida','Brig Faria Lima','3477','Andar 17a20 Tsul 2 17a20','Itaim Bibi'),(18,'01023040','SP','São Paulo','Rua','Comen Afonso Kherlakian','80','Box 16 e 18','Centro'),(19,'36010011','MG','Juiz de Fora','Avenida','Rio Branco','2337','Sala 602','Centro'),(20,'07190100','SP','Guarulhos','Rodovia','Hélio Smidt','122','bloc 102','Aeroporto'),(21,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(22,'00000000','SP','Cayman Brac','Rua','P.o. Box 268, Floor 4 Willow House','S/N','Cricket Square Ky1-1104','Cayman Brac'),(23,'61775060','CE','Eusébio','Rua','Calixto Machado','21','','Pires Facanha'),(24,'89770000','SC','Seara','Avenida','Anita Garibaldi','189','Sala','Centro'),(25,'04543011','SP','São Paulo','Avenida','Pres Juscelino Kubitschek','2041','Conj 281 Bloco a Cond Wtorre Jk','Vila Nova Conceicao'),(26,'82980100','PR','Curitiba','Rua','Antonio Moreira Lopes','1590','','Cajuru'),(27,'04543011','SP','São Paulo','Avenida','Presidente Juscelino Kubitschek','2041','Andar 18, 20, 21, 22 e 23','Vila Nova Conceição'),(28,'05711001','SP','São Paulo','Rua','Dr. Luiz Migliano','977','','Jardim Cabore'),(29,'88010300','SC','Florianópolis','Rua','Tenente Silveira','221','Ed. Central Office Sala 08','Centro'),(30,'13086902','SP','Campinas','Rua','Doutor Ricardo Benetton Martins','1000','','Polo II de Alta Tecnologia (Campinas)'),(31,'06454050','SP','Barueri','Alameda','Grajaú','219','','Alphaville Centro Industrial e Empresarial/Alphaville.'),(32,'80010010','PR','Curitiba','Rua','Marechal Deodoro','630','','Centro'),(33,'04542000','SP','São Paulo','Rua','Leopoldo Couto Magalhães Júnior','700','','Itaim Bibi'),(34,'04538133','SP','São Paulo','Avenida','Brigadeiro Faria Lima','3477','','Itaim Bibi'),(35,'04565001','SP','São Paulo','Rua','Flórida','1970','','Cidade Monções'),(36,'13186525','SP','Hortolândia','Rodovia','Jornalista Francisco Aguirre Proença','','','Chácaras Assay'),(37,'06020902','SP','Osasco','Avenida','dos Autonomistas','1496','','Vila Yara'),(38,'05425902','SP','São Paulo','Avenida','Doutora Ruth Cardoso','7221','','Pinheiros'),(39,'05707001','SP','São Paulo','Rua','Itapaiuna','2434','','Jardim Morumbi'),(40,'04543011','SP','São Paulo','Avenida','Pres Juscelino Kubitschek','2041','Conj 281 Bloco a Cond Wtorre Jk','Vila Nova Conceicao');
/*!40000 ALTER TABLE `logradouro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `servico`
--

DROP TABLE IF EXISTS `servico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servico` (
  `protocolo` int NOT NULL AUTO_INCREMENT,
  `problema` varchar(255) NOT NULL,
  `prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'baixa',
  `atendimento` enum('N1','N2','N3') NOT NULL DEFAULT 'N1',
  `data_abertura` datetime NOT NULL,
  `status` enum('aberta','em andamento','concluida','pendente','cancelada') DEFAULT 'aberta',
  `prazo_estimado` date NOT NULL,
  `endereco_atendimento` varchar(500) DEFAULT NULL,
  `comentarios` varchar(255) DEFAULT NULL,
  `id_empresa_cliente_fk` int DEFAULT NULL,
  `id_alocacao_tecnico_fk` int DEFAULT NULL,
  `id_usuario_criador` int DEFAULT NULL,
  `categoria` enum('Hardware','Software','Redes','Suporte') DEFAULT 'Hardware',
  PRIMARY KEY (`protocolo`),
  KEY `id_empresa_cliente_fk` (`id_empresa_cliente_fk`),
  KEY `id_alocacao_tecnico_fk` (`id_alocacao_tecnico_fk`),
  KEY `idx_servico_status` (`status`),
  KEY `idx_servico_data` (`data_abertura`),
  KEY `idx_servico_usuario` (`id_usuario_criador`),
  CONSTRAINT `fk_servico_usuario` FOREIGN KEY (`id_usuario_criador`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `servico_ibfk_1` FOREIGN KEY (`id_empresa_cliente_fk`) REFERENCES `empresa_cliente` (`id_empresa_cliente`),
  CONSTRAINT `servico_ibfk_2` FOREIGN KEY (`id_alocacao_tecnico_fk`) REFERENCES `alocacao_tecnico` (`id_alocacao_tecnico`),
  CONSTRAINT `servico_ibfk_3` FOREIGN KEY (`id_usuario_criador`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=12541 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servico`
--

LOCK TABLES `servico` WRITE;
/*!40000 ALTER TABLE `servico` DISABLE KEYS */;
INSERT INTO `servico` VALUES (12510,'Servidor de arquivos lento','alta','N2','2025-11-01 09:00:00','em andamento','2025-11-03','Datacenter interno','Uso de disco acima de 95%.',80,80,112,'Redes'),(12511,'Queda recorrente de VPN','urgente','N2','2025-11-02 10:30:00','em andamento','2025-11-02','Filial Rio de Janeiro','Circuito derruba a cada 30 minutos.',81,81,113,'Redes'),(12512,'Erro de integração com ERP','alta','N2','2025-11-03 14:10:00','em andamento','2025-11-05','Matriz São Paulo','Falha em job de integração noturna.',82,82,114,'Software'),(12513,'Lentidão em aplicação web interna','media','N2','2025-11-04 15:45:00','em andamento','2025-11-07','Acesso via VPN','Respostas acima de 5s em horário de pico.',83,83,115,'Software'),(12514,'Estações com erros de disco','media','N2','2025-11-05 09:20:00','em andamento','2025-11-08','Setor financeiro','SMART aponta setores defeituosos.',84,84,116,'Hardware'),(12515,'Ponto de rede sem link','media','N2','2025-11-06 11:00:00','em andamento','2025-11-06','Andar 3 - Escritório','Sem luz de link na porta do switch.',85,85,117,'Redes'),(12516,'Falha em backup diário','alta','N2','2025-11-07 08:30:00','em andamento','2025-11-08','Servidor de backup','Jobs interrompidos por falta de espaço.',86,86,118,'Software'),(12517,'Erros de autenticação AD','alta','N2','2025-11-08 10:15:00','em andamento','2025-11-09','Controlador de domínio','Usuários relatam falha intermitente de login.',87,87,119,'Redes'),(12518,'Impressora de rede fora do ar','media','N2','2025-11-09 09:40:00','em andamento','2025-11-10','Setor jurídico','Fila de impressão travando há 2 dias.',88,88,120,'Hardware'),(12519,'Falha ao efetuar pagamento online','alta','N2','2025-11-10 11:25:00','em andamento','2025-11-12','Loja virtual','Timeout na integração com adquirente.',89,89,121,'Software'),(12520,'Sessões caindo em sistema web','media','N2','2025-11-11 09:10:00','em andamento','2025-11-13','Aplicação interna','Pool de conexões parece saturar em pico.',90,90,122,'Software'),(12521,'Perda de pacotes em link MPLS','alta','N2','2025-11-12 10:30:00','em andamento','2025-11-12','Filial Curitiba','Monitoramento indica 8% de perda.',91,91,123,'Redes'),(12522,'Jobs de ETL falhando','alta','N2','2025-11-13 07:50:00','em andamento','2025-11-15','Servidor de BI','Erro em transformação de dados financeiros.',92,92,124,'Software'),(12523,'Cadastro não sincroniza com CRM','media','N2','2025-11-14 09:35:00','em andamento','2025-11-16','Integração CRM','Mensagens se acumulam em fila.',93,93,125,'Software'),(12524,'Link de internet intermitente','alta','N2','2025-11-15 08:20:00','em andamento','2025-11-15','Matriz São Paulo','Operadora já acionada, aguardando retorno.',94,94,126,'Redes'),(12525,'Falha em cluster de aplicação','alta','N2','2025-11-16 13:10:00','em andamento','2025-11-18','Ambiente de produção','Um dos nós não retorna healthcheck.',95,95,127,'Software'),(12526,'Problemas em fila de mensagens','media','N2','2025-11-17 10:05:00','em andamento','2025-11-19','Integração entre serviços','Fila atingindo tamanho máximo.',96,96,128,'Software'),(12527,'Queda de APs em andar 2','media','N2','2025-11-18 09:30:00','em andamento','2025-11-18','Andar 2 - Escritório','Vários access points offline.',97,97,129,'Redes'),(12528,'Terminais POS sem comunicação','alta','N2','2025-11-19 11:40:00','em andamento','2025-11-20','Lojas físicas','Falha de comunicação com adquirente.',98,98,130,'Hardware'),(12529,'Aplicativo mobile instável','media','N2','2025-11-20 16:00:00','em andamento','2025-11-22','Usuários externos','Quedas frequentes em Android.',99,99,131,'Software'),(12530,'Corrupção em banco de produção','urgente','N3','2025-11-21 02:30:00','em andamento','2025-11-22','Servidor de produção','Restauração point-in-time em ambiente de teste.',100,100,132,'Software'),(12531,'Projeto de migração para nuvem','media','N3','2025-11-21 15:00:00','aberta','2025-12-20','Planejamento remoto','Levantamento de workloads iniciado.',101,101,133,'Suporte'),(12532,'Reestruturação de rede corporativa','alta','N3','2025-11-22 09:10:00','aberta','2025-12-31','Todas as filiais','Desenho de nova topologia backbone.',102,102,134,'Redes'),(12533,'Incidente de segurança (ransomware)','urgente','N3','2025-11-22 22:15:00','em andamento','2025-11-23','Unidade Campinas','Máquinas isoladas e varredura em execução.',103,103,135,'Software'),(12534,'Integração complexa com parceiro','media','N3','2025-11-23 14:40:00','aberta','2025-12-15','API externa','Definição de contratos e autenticação.',104,104,136,'Software'),(12535,'Cluster de banco instável','alta','N3','2025-11-24 23:05:00','em andamento','2025-11-26','Cluster primário','Revisão de quorum e failover.',105,105,137,'Software'),(12536,'Latência alta em CDN','media','N3','2025-11-25 10:20:00','em andamento','2025-11-27','Aplicação global','Comparação entre POPs.',106,106,138,'Redes'),(12537,'Refatoração de módulo legado','baixa','N3','2025-11-26 15:35:00','aberta','2026-01-15','Módulo financeiro','Quebra em serviços menores planejada.',107,107,139,'Software'),(12538,'Projeto de observabilidade','baixa','N3','2025-11-27 09:00:00','aberta','2026-01-31','Ambiente híbrido','Definição de métricas e dashboards.',108,108,140,'Suporte'),(12539,'Planejamento de DR site secundário','media','N3','2025-11-28 11:20:00','aberta','2026-02-10','Site secundário','Estudo de RPO e RTO.',109,109,141,'Suporte');
/*!40000 ALTER TABLE `servico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tecnico`
--

DROP TABLE IF EXISTS `tecnico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tecnico` (
  `id_tecnico` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(200) NOT NULL,
  `email` varchar(200) DEFAULT NULL,
  `telefone` varchar(25) DEFAULT NULL,
  `especialidade` varchar(50) DEFAULT NULL,
  `nivel_experiencia` varchar(10) NOT NULL,
  `preco_hora` decimal(10,2) DEFAULT '100.00',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `data_contratacao` date NOT NULL,
  `data_cadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_empresa_cliente_fk` int DEFAULT NULL,
  PRIMARY KEY (`id_tecnico`),
  KEY `idx_tecnico_data_cadastro` (`data_cadastro`),
  KEY `idx_tecnico_nome` (`nome`),
  KEY `idx_tecnico_empresa` (`id_empresa_cliente_fk`),
  CONSTRAINT `fk_tecnico_empresa` FOREIGN KEY (`id_empresa_cliente_fk`) REFERENCES `empresa_cliente` (`id_empresa_cliente`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tecnico`
--

LOCK TABLES `tecnico` WRITE;
/*!40000 ALTER TABLE `tecnico` DISABLE KEYS */;
INSERT INTO `tecnico` VALUES (20,'João Andrade','joao.andrade@google.com','(11) 90000-1001','Hardware','Senior',180.00,1,'2023-01-10','2025-12-05 01:35:27',80),(21,'Maria Ferreira','maria.ferreira@microsoft.com','(11) 90000-1002','Software','Pleno',150.00,1,'2023-02-15','2025-12-05 01:35:27',81),(22,'Carlos Santos','carlos.santos@ibm.com','(11) 90000-1003','Redes','Senior',200.00,1,'2023-03-20','2025-12-05 01:35:27',82),(23,'Ana Rodrigues','ana.rodrigues@oracle.com','(11) 90000-1004','Suporte','Senior',190.00,1,'2023-04-05','2025-12-05 01:35:27',83),(24,'Rafael Souza','rafael.souza@sap.com','(11) 90000-1005','Hardware','Senior',220.00,1,'2023-05-12','2025-12-05 01:35:27',84),(25,'Luciana Costa','luciana.costa@totvs.com.br','(11) 90000-1006','Software','Pleno',170.00,1,'2023-06-01','2025-12-05 01:35:27',85),(26,'Bruno Almeida','bruno.almeida@pagseguro.com.br','(11) 90000-1007','Redes','Pleno',160.00,1,'2023-06-20','2025-12-05 01:35:27',86),(27,'Fernanda Lima','fernanda.lima@locaweb.com.br','(11) 90000-1008','Suporte','Senior',185.00,1,'2023-07-03','2025-12-05 01:35:27',87),(28,'Diego Martins','diego.martins@amazon.com.br','(11) 90000-1009','Hardware','Senior',210.00,1,'2023-07-18','2025-12-05 01:35:27',88),(29,'Patrícia Nogueira','patricia.nogueira@fb.com','(11) 90000-1010','Software','Pleno',165.00,1,'2023-08-02','2025-12-05 01:35:27',89),(30,'Gustavo Ribeiro','gustavo.ribeiro@mercadolivre.com','(11) 90000-1011','Redes','Senior',195.00,1,'2023-08-15','2025-12-05 01:35:27',90),(31,'Camila Duarte','camila.duarte@nubank.com.br','(11) 90000-1012','Suporte','Pleno',175.00,1,'2023-09-01','2025-12-05 01:35:27',91),(32,'Rodrigo Teixeira','rodrigo.teixeira@stone.com.br','(11) 90000-1013','Hardware','Senior',200.00,1,'2023-09-20','2025-12-05 01:35:27',92),(33,'Thais Menezes','thais.menezes@cielo.com.br','(11) 90000-1014','Software','Senior',205.00,1,'2023-10-01','2025-12-05 01:35:27',93),(34,'Felipe Araujo','felipe.araujo@linx.com.br','(11) 90000-1015','Redes','Pleno',160.00,1,'2023-10-10','2025-12-05 01:35:27',94),(35,'Viviane Prado','viviane.prado@ifood.com.br','(11) 90000-1016','Suporte','Pleno',170.00,1,'2023-10-25','2025-12-05 01:35:27',95),(36,'Henrique Moraes','henrique.moraes@netflix.com','(11) 90000-1017','Hardware','Senior',210.00,1,'2023-11-05','2025-12-05 01:35:27',96),(37,'Marina Lopes','marina.lopes@xpi.com.br','(11) 90000-1018','Software','Senior',215.00,1,'2023-11-15','2025-12-05 01:35:27',97),(38,'Ricardo Magalhaes','ricardo.magalhaes@magazineluiza.com.br','(16) 90000-1019','Redes','Pleno',155.00,1,'2023-11-25','2025-12-05 01:35:27',98),(39,'Juliana Cardoso','juliana.cardoso@casasbahia.com.br','(11) 90000-1020','Suporte','Pleno',140.00,1,'2023-12-01','2025-12-05 01:35:27',99),(40,'Fernando Silva','fernando.silva@ciandt.com','(19) 90000-1021','Hardware','Senior',190.00,1,'2023-12-10','2025-12-05 01:35:27',100),(41,'Larissa Gomes','larissa.gomes@ayty.com.br','(11) 90000-1022','Software','Pleno',130.00,1,'2024-01-05','2025-12-05 01:35:27',101),(42,'Renato Farias','renato.farias@pipefy.com','(41) 90000-1023','Redes','Pleno',165.00,1,'2024-01-15','2025-12-05 01:35:27',102),(43,'Aline Barbosa','aline.barbosa@ebanx.com','(41) 90000-1024','Suporte','Senior',195.00,1,'2024-01-25','2025-12-05 01:35:27',103),(44,'Eduardo Brito','eduardo.brito@neon.com.br','(11) 90000-1025','Hardware','Pleno',160.00,1,'2024-02-05','2025-12-05 01:35:27',104),(45,'Simone Carvalho','simone.carvalho@senior.com.br','(47) 90000-1026','Software','Senior',185.00,1,'2024-02-15','2025-12-05 01:35:27',105),(46,'Marcos Vieira','marcos.vieira@totvs.com.br','(47) 90000-1027','Redes','Pleno',170.00,1,'2024-02-25','2025-12-05 01:35:27',106),(47,'Beatriz Fonseca','beatriz.fonseca@pagseguro.com.br','(11) 90000-1028','Suporte','Senior',205.00,1,'2024-03-05','2025-12-05 01:35:27',107),(48,'Helena Rocha','helena.rocha@locaweb.com.br','(11) 90000-1029','Hardware','Pleno',160.00,1,'2024-03-15','2025-12-05 01:35:27',108),(49,'Pedro Henrique','pedro.henrique@mercadolivre.com','(11) 90000-1030','Software','Senior',210.00,1,'2024-03-25','2025-12-05 01:35:27',109);
/*!40000 ALTER TABLE `tecnico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  `telefone` varchar(30) DEFAULT NULL,
  `admin` tinyint(1) DEFAULT '0',
  `email` varchar(250) NOT NULL,
  `id_empresa_cliente_fk` int DEFAULT NULL,
  `senha` varchar(255) NOT NULL,
  `data_cadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `unique_email` (`email`),
  KEY `id_empresa_cliente_fk` (`id_empresa_cliente_fk`),
  KEY `idx_usuario_data_cadastro` (`data_cadastro`),
  KEY `idx_usuario_email` (`email`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_empresa_cliente_fk`) REFERENCES `empresa_cliente` (`id_empresa_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (15,'Igor Oliveira','11961365647',1,'igor.silv802@gmail.com',NULL,'scrypt:32768:8:1$q3xK9oVT339GWnEA$e6a51b341fea7e0533457e5924578becd3b6e06664634e385dfa1f05481aa0fe441edc61d017c345cc9424cdfc8f1279c5f26e4f1854c9f09fa848989e6058f3','2025-10-23 14:09:31'),(16,'Henrique Alcântara','1198102',1,'henryque.alc@gmail.com',NULL,'scrypt:32768:8:1$l3WkedQw7qcoTK4e$ba2318b5dd7bfa2da32010f911295eb3f59155978ba703dc25cc6cbdc2cc61821a72e0b9e65cbb95ee4408d05b7162d4d8b2280a27096117608d7e1d1cdf5733','2025-10-23 14:09:31'),(17,'Kaillany Garcia','1195206',1,'kaillanygarcia03@gmail.com',NULL,'scrypt:32768:8:1$hmdB5nSP8J0ZqELQ$d17047f7061abfa6c3932ddbcb096d7eb1fc1e2788356c8d90c49a3bb8c0843bbaaaccc7098a977aa213977acae042bf49927b8fe71352d4e1920fa7cef23d4a','2025-10-23 14:09:31'),(18,'Gabriel Oliveira','11988645618',1,'gh5931808@gmail.com',NULL,'scrypt:32768:8:1$hsKbpEQxKUsDVasu$ae82683d6a79a82696f7287b83c6127c343ae0ab9e0df03a20a28500d2fcf21ee8124c0a06c5393049f4caa1a1749a088349a1ad14da0d6d16e1ebd9a19869a8','2025-10-23 14:09:31'),(19,'Caio Lacerda','1193437',1,'caio51lacerda@gmail.com',NULL,'scrypt:32768:8:1$3lAXwfBVBX073WWy$a949c3b3d9b6274e8042a670675791ab5ce4dfa57f3e6f3d298d702a83f7397e8e45a208ed6a99e98f153f1084fd8d0787c22586173fb78bb52aa769c6c58cba','2025-10-23 14:09:31'),(112,'João Pereira','(11) 98888-1001',0,'joao.pereira@teste.com',80,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(113,'Maria Souza','(11) 98888-1002',0,'maria.souza@teste.com',81,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(114,'Carlos Lima','(11) 98888-1003',0,'carlos.lima@teste.com',82,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(115,'Ana Bezerra','(11) 98888-1004',0,'ana.bezerra@teste.com',83,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(116,'Rafael Costa','(11) 98888-1005',0,'rafael.costa@teste.com',84,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(117,'Luciana Almeida','(11) 98888-1006',0,'luciana.almeida@teste.com',85,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(118,'Bruno Ferreira','(11) 98888-1007',0,'bruno.ferreira@teste.com',86,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(119,'Fernanda Rocha','(11) 98888-1008',0,'fernanda.rocha@teste.com',87,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(120,'Diego Martins','(11) 98888-1009',0,'diego.martins@teste.com',88,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(121,'Patricia Nunes','(11) 98888-1010',0,'patricia.nunes@teste.com',89,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(122,'Gustavo Ribeiro','(11) 98888-1011',0,'gustavo.ribeiro@teste.com',90,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(123,'Camila Duarte','(11) 98888-1012',0,'camila.duarte@teste.com',91,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(124,'Rodrigo Teixeira','(11) 98888-1013',0,'rodrigo.teixeira@teste.com',92,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(125,'Thais Menezes','(11) 98888-1014',0,'thais.menezes@teste.com',93,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(126,'Felipe Araujo','(11) 98888-1015',0,'felipe.araujo@teste.com',94,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(127,'Viviane Prado','(11) 98888-1016',0,'viviane.prado@teste.com',95,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(128,'Henrique Moraes','(11) 98888-1017',0,'henrique.moraes@teste.com',96,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(129,'Marina Lopes','(11) 98888-1018',0,'marina.lopes@teste.com',97,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(130,'Ricardo Magalhaes','(16) 98888-1019',0,'ricardo.magalhaes@teste.com',98,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(131,'Juliana Cardoso','(11) 98888-1020',0,'juliana.cardoso@teste.com',99,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(132,'Fernando Silva','(19) 98888-1021',0,'fernando.silva@teste.com',100,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(133,'Larissa Gomes','(11) 98888-1022',0,'larissa.gomes@teste.com',101,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(134,'Renato Farias','(41) 98888-1023',0,'renato.farias@teste.com',102,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(135,'Aline Barbosa','(41) 98888-1024',0,'aline.barbosa@teste.com',103,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(136,'Eduardo Brito','(11) 98888-1025',0,'eduardo.brito@teste.com',104,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(137,'Simone Carvalho','(47) 98888-1026',0,'simone.carvalho@teste.com',105,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(138,'Marcos Vieira','(47) 98888-1027',0,'marcos.vieira@teste.com',106,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(139,'Beatriz Fonseca','(11) 98888-1028',0,'beatriz.fonseca@teste.com',107,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(140,'Helena Rocha','(11) 98888-1029',0,'helena.rocha@teste.com',108,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(141,'Pedro Henrique','(11) 98888-1030',0,'pedro.henrique@teste.com',109,'sha256:a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','2025-12-05 01:32:59'),(146,'teste','1',0,'teste@teste',NULL,'scrypt:32768:8:1$8IM8JfvjUyBBCTXL$2546a112e4fd585bca255c0a48649870e017ee0b353733a5e51df33d6729abd19caf080ebe6629462808e3ec80c536b2d5482eea7c2ac3658819aa0e7b7706a3','2025-12-05 02:45:01'),(147,'Bruno Guimarão','(11) 82727-2382',0,'gh5911808@gmail.com',112,'scrypt:32768:8:1$4QTPYYHzT6ic6BMG$d427b2a11e0869070ca0ac2b27677b3b3e4a8bfa054d600e35e2457bf75c46579f2404cd8fcc4cb75f8bbed3388886fb234336fcdfeba38f5daba116e30e9b9a','2025-12-05 02:54:38');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-05  3:21:23
