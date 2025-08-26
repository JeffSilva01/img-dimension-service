# Image Dimension Service

Um serviço back-end em Node.js com TypeScript usando Fastify para calcular as dimensões físicas de imagens em milímetros baseado em seus metadados DPI.

## Funcionalidades

- Recebe imagens via upload HTTP
- Lê metadados EXIF para identificar o DPI real da imagem
- Calcula dimensões físicas em milímetros usando a fórmula:
  - `largura_mm = (largura_px / DPI_x) * 25.4`
  - `altura_mm = (altura_px / DPI_y) * 25.4`
- Assume DPI padrão de 72 quando não disponível nos metadados
- Retorna resposta JSON estruturada

## Tecnologias

- **Node.js** com **TypeScript**
- **Fastify** - Framework web rápido e eficiente
- **Sharp** - Processamento de imagens
- **ExifReader** - Leitura de metadados EXIF
- **ESLint** e **Prettier** - Qualidade de código

## Instalação

### Pré-requisitos

- Node.js 18+ 
- npm

### Configuração Local

1. Clone o repositório:
```bash
git clone <repo-url>
cd img-dimension-service
```

2. Instale as dependências:
```bash
npm install
```

3. Execute em modo de desenvolvimento:
```bash
npm run dev
```

4. Ou compile e execute:
```bash
npm run build
npm start
```

O servidor estará disponível em `http://localhost:3000`

## Uso da API

### POST /upload

Envia uma imagem para análise de dimensões.

**Request:**
- Content-Type: `multipart/form-data`
- Body: arquivo de imagem

**Response:**
```json
{
  "width_mm": 200.5,
  "height_mm": 100.2,
  "dpi_x": 300,
  "dpi_y": 300
}
```

### GET /health

Verifica o status do serviço.

**Response:**
```json
{
  "status": "ok"
}
```

## Exemplo de Uso

```bash
curl -X POST -F "file=@image.jpg" http://localhost:3000/upload
```

## Deploy no Netlify Functions

### 1. Configuração para Serverless

Crie o arquivo `netlify/functions/upload.ts`:

```typescript
import { Handler } from '@netlify/functions';
import multipart from 'parse-multipart-data';
import { processImage } from '../../src/imageService';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';
    const body = Buffer.from(event.body || '', 'base64');
    
    const boundary = contentType.split('boundary=')[1];
    const parts = multipart.parse(body, boundary);
    
    const filePart = parts.find(part => part.name === 'file');
    if (!filePart) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file uploaded' }),
      };
    }

    const dimensions = await processImage(filePart.data);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(dimensions),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

### 2. Configuração do Netlify

Crie `netlify.toml`:

```toml
[build]
  command = "npm run build"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### 3. Deploy

1. Conecte seu repositório ao Netlify
2. Configure as variáveis de build:
   - Build command: `npm run build`
   - Functions directory: `netlify/functions`
3. Deploy

A função estará disponível em `https://your-site.netlify.app/.netlify/functions/upload`

## Scripts Disponíveis

- `npm run dev` - Executa em modo desenvolvimento com hot reload
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Executa a versão compilada
- `npm run lint` - Verifica código com ESLint
- `npm run lint:fix` - Corrige problemas automaticamente
- `npm run format` - Formata código com Prettier

## Estrutura do Projeto

```
img-dimension-service/
├── src/
│   ├── index.ts          # Servidor principal
│   ├── imageService.ts   # Lógica de processamento
│   └── types.ts          # Definições de tipos
├── netlify/
│   └── functions/        # Funções serverless (opcional)
├── dist/                 # Código compilado
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## Limitações

- Suporta formatos de imagem comum (JPEG, PNG, GIF, WebP, etc.)
- Assume DPI padrão de 72 quando metadados não estão disponíveis
- Limites de upload dependem da configuração do servidor

## Contribuição

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request