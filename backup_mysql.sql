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
  `data_inicio_alocacao` datetime NOT NULL,
  `data_fim_alocacao` datetime DEFAULT NULL,
  `id_tecnico_fk` int DEFAULT NULL,
  `protocolo_fk` int DEFAULT NULL,
  PRIMARY KEY (`id_alocacao_tecnico`),
  KEY `protocolo_fk` (`protocolo_fk`),
  KEY `alocacao_tecnico_ibfk_1` (`id_tecnico_fk`),
  CONSTRAINT `alocacao_tecnico_ibfk_1` FOREIGN KEY (`id_tecnico_fk`) REFERENCES `tecnico` (`id_tecnico`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alocacao_tecnico_ibfk_2` FOREIGN KEY (`protocolo_fk`) REFERENCES `servico` (`protocolo`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alocacao_tecnico`
--

LOCK TABLES `alocacao_tecnico` WRITE;
/*!40000 ALTER TABLE `alocacao_tecnico` DISABLE KEYS */;
INSERT INTO `alocacao_tecnico` VALUES (24,'2025-11-24 00:00:00','2025-11-26 21:36:24',6,12355),(25,'2025-11-26 00:00:00','2025-11-26 21:36:28',6,12356),(26,'2025-11-26 00:00:00','2025-11-26 21:36:26',6,12357),(27,'2025-11-26 00:00:00','2025-11-26 21:36:21',7,12358),(28,'2025-11-27 00:00:00',NULL,6,12359),(29,'2025-11-27 00:00:00',NULL,6,12360),(30,'2025-11-27 00:00:00',NULL,8,12361),(31,'2025-11-27 00:00:00',NULL,5,12362);
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `avaliacao`
--

LOCK TABLES `avaliacao` WRITE;
/*!40000 ALTER TABLE `avaliacao` DISABLE KEYS */;
INSERT INTO `avaliacao` VALUES (1,6,12357,69,5.0,'','2025-11-26 22:43:56');
/*!40000 ALTER TABLE `avaliacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chatbot`
--

DROP TABLE IF EXISTS `chatbot`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbot` (
  `data_conversa` datetime NOT NULL,
  `descricao_conversa` longtext NOT NULL,
  `protocolo_fk` int DEFAULT NULL,
  `id_usuario_fk` int DEFAULT NULL,
  KEY `protocolo_fk` (`protocolo_fk`),
  KEY `id_usuario_fk` (`id_usuario_fk`),
  CONSTRAINT `chatbot_ibfk_1` FOREIGN KEY (`protocolo_fk`) REFERENCES `servico` (`protocolo`),
  CONSTRAINT `chatbot_ibfk_2` FOREIGN KEY (`id_usuario_fk`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chatbot`
--

LOCK TABLES `chatbot` WRITE;
/*!40000 ALTER TABLE `chatbot` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatbot` ENABLE KEYS */;
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
  `endereco` varchar(255) DEFAULT NULL,
  `id_logradouro_fk` int DEFAULT NULL,
  `data_cadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_empresa_cliente`),
  UNIQUE KEY `CNPJ` (`CNPJ`),
  KEY `id_logradouro_fk` (`id_logradouro_fk`),
  KEY `idx_empresa_data_cadastro` (`data_cadastro`),
  CONSTRAINT `empresa_cliente_ibfk_1` FOREIGN KEY (`id_logradouro_fk`) REFERENCES `logradouro` (`id_logradouro`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresa_cliente`
--

LOCK TABLES `empresa_cliente` WRITE;
/*!40000 ALTER TABLE `empresa_cliente` DISABLE KEYS */;
INSERT INTO `empresa_cliente` VALUES (45,'BOLOLO RESTAURANT & BAR LTDA','47387721000160','1133334444','contato@contato.com.br',NULL,14,'2025-11-22 00:29:53'),(46,'BANANA CAFE LANCHONETE E RESTAURANTE LTDA','38060615000186','1155498164','depoimentos@contabildiferencial.com.br',NULL,15,'2025-11-24 11:27:13'),(47,'BANCO SANTANDER (BRASIL) S.A.','90400888000142','1140043535','cadastro.santander@targetlaw.com.br',NULL,16,'2025-11-26 02:57:24'),(48,'GOOGLE BRASIL INTERNET LTDA.','06990590000123','1123958400','googlebrasil@google.com',NULL,17,'2025-11-26 20:40:46'),(49,'JACOB COMERCIO DE ACESSORIOS LTDA','59516902000128','1188125901','alessandrafontao@hotmail.com',NULL,18,'2025-11-27 03:11:34'),(50,'seila','00101110101101','','emailempresa@gmail.com',NULL,NULL,'2025-11-27 14:45:58');
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `logradouro`
--

LOCK TABLES `logradouro` WRITE;
/*!40000 ALTER TABLE `logradouro` DISABLE KEYS */;
INSERT INTO `logradouro` VALUES (1,'08595856','SP','Itaquaquecetuba','Rua Belo J',NULL,'126',NULL,'Terra Prometida'),(2,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','231',NULL,'Terra Prometida'),(3,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','120',NULL,'Terra Prometida'),(4,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','150',NULL,'Terra Prometida'),(5,'08570320','SP','Itaquaquecetuba','Rua','Casemiro de Abreu','125',NULL,'Vila Maria Augusta'),(6,'08595856','SP','Itaquaquecetuba','Rua','Belo Jardim','150',NULL,'Terra Prometida'),(7,'69911878','AC','Rio Branco','Rua','Frei Thiago','123',NULL,'Ayrton Senna'),(8,'32132132','PE','dcsadsaxd','Rua','fdsfdsfsdfsd','32131','sad','dsadsas'),(9,'69911878','AC','Rio Branco','Rua','Frei Thiago','69',NULL,'Ayrton Senna'),(10,'08570320','SP','Itaquaquecetuba','Rua','Casemiro de Abreu','125',NULL,'Vila Maria Augusta'),(11,'69907550','AC','Rio Branco','Travessa','Padre Thiago Padre','111','','Recanto dos Buritis'),(12,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(13,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(14,'03335060','SP','São Paulo','Rua','Praca Vinte de Janeiro','57','','Vila Regente Feijó'),(15,'03904070','SP','São Paulo','Rua','Felipe dos Santos Freire','S/N','','Jardim Tango'),(16,'04543011','SP','São Paulo','Avenida','Pres Juscelino Kubitschek','2041','Conj 281 Bloco a Cond Wtorre Jk','Vila Nova Conceicao'),(17,'04538133','SP','São Paulo','Avenida','Brig Faria Lima','3477','Andar 17a20 Tsul 2 17a20','Itaim Bibi'),(18,'01023040','SP','São Paulo','Rua','Comen Afonso Kherlakian','80','Box 16 e 18','Centro');
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
) ENGINE=InnoDB AUTO_INCREMENT=12363 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `servico`
--

LOCK TABLES `servico` WRITE;
/*!40000 ALTER TABLE `servico` DISABLE KEYS */;
INSERT INTO `servico` VALUES (12355,'Meu computador pegou virus ontem eu tentei resolver e ele n liga mais oque eu faço?','baixa','N1','2025-11-24 00:00:00','concluida','2025-12-01',NULL,NULL,46,NULL,67,'Software'),(12356,'meu computador não liga mais','media','N1','2025-11-26 00:00:00','concluida','2025-12-03','Praça Carlos Gomes, 121 - Setor 1 - Altônia/PR - CEP: 87550-970',NULL,47,NULL,68,'Software'),(12357,'meu computador não liga','media','N1','2025-11-26 00:00:00','concluida','2025-12-03','Praça Carlos Gomes, 120 - Setor 1 - Altônia/PR - CEP: 87550-970',NULL,48,NULL,69,'Software'),(12358,'meu computador não liga','baixa','N1','2025-11-26 00:00:00','concluida','2025-12-03','Rua Belo Jardim, 111 - Terra Prometida - Itaquaquecetuba/SP - CEP: 08595-856',NULL,45,NULL,66,'Redes'),(12359,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','baixa','N1','2025-11-27 00:00:00','em andamento','2025-12-04','Rua Arnulpho de Lima, 123 - Vila Santa Cruz - Franca/SP - CEP: 14403-471',NULL,49,NULL,70,'Software'),(12360,'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','media','N1','2025-11-27 00:00:00','em andamento','2025-12-04','Rua Arnulpho de Lima, 123 - Vila Santa Cruz - Franca/SP - CEP: 14403-471',NULL,49,NULL,70,'Software'),(12361,'nmnnmnnnnnmnmnnmnmnm','urgente','N1','2025-11-27 00:00:00','em andamento','2025-12-04','Avenida Henrique Eroles, 1000 - Alto Ipiranga - Mogi das Cruzes/SP - CEP: 08730-590',NULL,50,NULL,71,'Redes'),(12362,'to com dor no roteador','alta','N1','2025-11-27 00:00:00','em andamento','2025-12-04','Avenida Henrique Eroles, 1 - Alto Ipiranga - Mogi das Cruzes/SP - CEP: 08730-590',NULL,50,NULL,71,'Software');
/*!40000 ALTER TABLE `servico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `servicos`
--

DROP TABLE IF EXISTS `servicos`;
/*!50001 DROP VIEW IF EXISTS `servicos`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `servicos` AS SELECT 
 1 AS `protocolo`,
 1 AS `nome`,
 1 AS `id_tecnico_fk`,
 1 AS `atendimento`,
 1 AS `problema`*/;
SET character_set_client = @saved_cs_client;

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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tecnico`
--

LOCK TABLES `tecnico` WRITE;
/*!40000 ALTER TABLE `tecnico` DISABLE KEYS */;
INSERT INTO `tecnico` VALUES (5,'Roberto','robertinho@gmail.com','11253245422','Software','',100.00,1,'0000-00-00','2025-11-16 06:11:29',NULL),(6,'Roberta',NULL,'','Software','Junior',100.00,1,'2025-11-21','2025-11-21 18:58:26',NULL),(7,'ALBERTO DA SILVA','gh22102008@gmail.com','11988421727','Redes','Senior',125.00,1,'2025-11-26','2025-11-26 20:42:15',NULL),(8,'Rogeria',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:47:34',NULL),(9,'carlos',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:47:41',NULL),(10,'bruno',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:47:49',NULL),(11,'stuart',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:47:58',NULL),(12,'igor',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:48:07',NULL),(13,'lucas',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:48:19',NULL),(14,'vitor',NULL,NULL,'Redes','Junior',100.00,1,'2025-11-26','2025-11-26 22:48:25',NULL);
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
  `telefone` char(11) NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (15,'Igor Oliveira','(11) 96136-',1,'igor.silv802@gmail.com',NULL,'scrypt:32768:8:1$q3xK9oVT339GWnEA$e6a51b341fea7e0533457e5924578becd3b6e06664634e385dfa1f05481aa0fe441edc61d017c345cc9424cdfc8f1279c5f26e4f1854c9f09fa848989e6058f3','2025-10-23 14:09:31'),(16,'henrique','(11) 98102-',1,'henryque.alc@gmail.com',NULL,'scrypt:32768:8:1$l3WkedQw7qcoTK4e$ba2318b5dd7bfa2da32010f911295eb3f59155978ba703dc25cc6cbdc2cc61821a72e0b9e65cbb95ee4408d05b7162d4d8b2280a27096117608d7e1d1cdf5733','2025-10-23 14:09:31'),(17,'Kaillany','(11) 95206-',1,'kaillanygarcia03@gmail.com',NULL,'scrypt:32768:8:1$hmdB5nSP8J0ZqELQ$d17047f7061abfa6c3932ddbcb096d7eb1fc1e2788356c8d90c49a3bb8c0843bbaaaccc7098a977aa213977acae042bf49927b8fe71352d4e1920fa7cef23d4a','2025-10-23 14:09:31'),(18,'Gabriel Henrique Xavier Oliveira ','(11) 98864-',1,'gh5931808@gmail.com',NULL,'scrypt:32768:8:1$hsKbpEQxKUsDVasu$ae82683d6a79a82696f7287b83c6127c343ae0ab9e0df03a20a28500d2fcf21ee8124c0a06c5393049f4caa1a1749a088349a1ad14da0d6d16e1ebd9a19869a8','2025-10-23 14:09:31'),(19,'Caio Lacerda','(11) 93437-',1,'caio51lacerda@gmail.com',NULL,'scrypt:32768:8:1$3lAXwfBVBX073WWy$a949c3b3d9b6274e8042a670675791ab5ce4dfa57f3e6f3d298d702a83f7397e8e45a208ed6a99e98f153f1084fd8d0787c22586173fb78bb52aa769c6c58cba','2025-10-23 14:09:31'),(20,'Matheus','(11) 92335-',0,'matheustecgru@gmail.com',NULL,'scrypt:32768:8:1$ZExBx8lBktdWgN0S$a691f04f01f5bddc7e941b72c6d2235ae7248ab94e22556d347e93bba5e01cf805232e63e82978ec38b8d5cfc25e7f4b66bca5a9a1b3cc591845cbaf73d1052d','2025-10-23 14:09:31'),(21,'Paulo','(13) 99744-',0,'pmarcelodileva@gmail.com',NULL,'scrypt:32768:8:1$0AM10faLu3rebxqR$0901af4257b105a2b400adabc879180cb23c706f8e5815e479c701e88db8fef996b4d40528b1aef75d4c4f5f8a4fe3388a8dd78a99c28c3a335c091c5cfb6f05','2025-10-23 14:09:31'),(22,'Igor','(11) 91164-',0,'igorctavares99@gmail.com',NULL,'scrypt:32768:8:1$pU0euRWQ3p2cAsPh$cc227f493cb5873fbf1561ad4584470b100281f0cb593805ce8b968d1e759a854645e8f4e0671c9364d3f03efede881dcd12dbd5269be469358580d35b8bb5f1','2025-10-23 14:09:31'),(23,'Isis','(11) 99999-',0,'isis@gmail.com',NULL,'scrypt:32768:8:1$eujv1LI6sNAeDcrb$e857a87e6deddfa189313e365f415a93e3b4af06735b82d0145d13fea7d3d67f410afb5b60cd013634753f61160223ae77ff4fdbb4545a9051d535ee8f7d5825','2025-10-23 14:09:31'),(24,'Arthur','11935854879',0,'arthurenzo0226@gmail.com',NULL,'scrypt:32768:8:1$Iw1GFbi1XqHF94zZ$72393c2436d4288fc347a7b81ebb3b56f78888dcbf1144833cf3bb64fd59afc074eea5d1848f7e23b8b2447b783a6a27ee84b8983117923f65710070dd6f3c58','2025-10-23 14:09:31'),(66,'Carro Rapidão','11827272382',0,'gh5961808@gmail.com',45,'scrypt:32768:8:1$A91YLsGPPbXNEE4c$db8375a844c27c0939414536bb42620aaabb749c9733d6397488fb4d9d39fb4a20785f3d67a7d2b0f8d271e43f72dbbf62a9dbb8a8711e895bbb4a6375a9fc8a','2025-11-22 00:29:53'),(67,'Claudinete Silva','11956563830',0,'ref123@gmail.com',46,'scrypt:32768:8:1$CXyeXj5KpyegeIUo$72449f29f74ede5d28071e344ca36282287b1441edf87d2125c89a42adc3f28c0b21a97b66579608cfe7c0088ed296c7b9fd299c2e9e1edcac2ab369a6a6c500','2025-11-24 11:27:14'),(68,'Carro Rapidão','11982382322',0,'gh5921808@gmail.com',47,'scrypt:32768:8:1$jfkdLegugODKhyu7$d993b306268659b6dda76be3cadd76b1505d1ebf70746989c28057df01f93156cf27b33af22bb201e73ae92e93d2d18b825d0188c34b82635decf4cef8386af7','2025-11-26 02:57:24'),(69,'Bruno Guimarão','11982382322',0,'gh5911808@gmail.com',48,'scrypt:32768:8:1$S5t3J6bbESs5KS1K$13f51d16880366367e0557b94c662e383f3e1b6cf109d97becbfa64673c62958e04a2f5cce76d172f3f7f3f9838937566c15d1ba2dce0370a08b65d439a3f543','2025-11-26 20:40:46'),(70,'Igor','11999999999',0,'teste@123.com',49,'scrypt:32768:8:1$iUYyFM4LCPzT4PEG$da51b0209746002a3906e3d114dcc9a2ff8aa15d16b2b24fba88181257f22b6af9de8682a5384b3e43f9a17a3d91840acfb894e9bbf0400f61edc7efdfc7fdff','2025-11-27 03:11:34'),(71,'lacerda usuario','11934378868',0,'caio.araujolacerda10@gmail.com',50,'scrypt:32768:8:1$EKIm6BNei35JkNQv$db87148b13317484b55c47ccbaa431b04b6450de7b18da47e6d012525ff3d92279a628a255baadb4918edb113b6c54f1c91a1ed5d9db4df41d08a40466a71043','2025-11-27 14:45:59');
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `servicos`
--

/*!50001 DROP VIEW IF EXISTS `servicos`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`IGECHTECH`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `servicos` AS select `s`.`protocolo` AS `protocolo`,`ec`.`nome` AS `nome`,`alt`.`id_tecnico_fk` AS `id_tecnico_fk`,`s`.`atendimento` AS `atendimento`,`s`.`problema` AS `problema` from ((`servico` `s` join `empresa_cliente` `ec` on((`s`.`id_empresa_cliente_fk` = `ec`.`id_empresa_cliente`))) join `alocacao_tecnico` `alt` on((`s`.`protocolo` = `alt`.`protocolo_fk`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-28  3:41:41
