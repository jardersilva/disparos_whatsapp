# Disparos WhatsApp

Disparo de mensagens em massa via [Evolution API](https://doc.evolution-api.com) (v2), com importação de contatos por planilha e gerenciamento de instâncias (criar, conectar por QR Code ou código de pareamento, desconectar e excluir).

## Configuração

A API key **não** vai para o navegador: o front chama `/evolution/...` e um proxy (Vite em dev, nginx em produção) repassa para a Evolution adicionando o header `apikey`.

| Variável | Onde | Descrição |
| --- | --- | --- |
| `EVOLUTION_API_URL` | runtime | URL da Evolution API, ex.: `https://evolution.seudominio.com` |
| `EVOLUTION_API_KEY` | runtime | Key **global** (`AUTHENTICATION_API_KEY` do servidor Evolution). Necessária para listar/criar/excluir instâncias. |
| `VITE_EVOLUTION_INSTANCE_NAME` | build (opcional) | Instância selecionada por padrão. |

> Qualquer pessoa que acessar o app consegue usar a Evolution através do proxy. Não deixe o app aberto na internet sem proteção (ex.: autenticação básica no Easypanel/nginx).

## Desenvolvimento

```bash
cp .env.example .env   # preencha as variáveis
npm install
npm run dev
```

## Produção (Docker)

```bash
docker build -t disparos-whatsapp .
docker run -p 8080:80 \
  -e EVOLUTION_API_URL=https://evolution.seudominio.com \
  -e EVOLUTION_API_KEY=sua-key-global \
  disparos-whatsapp
```

No Easypanel, defina `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` nas variáveis de ambiente do serviço. O nginx lê essas variáveis quando o container sobe, então não é preciso rebuildar para trocar a key.
