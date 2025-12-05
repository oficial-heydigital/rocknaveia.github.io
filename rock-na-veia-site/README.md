# Rock na Véia Website

## Descrição do Projeto
Este projeto é o site oficial da banda Rock na Véia. O site foi desenvolvido para fornecer informações sobre a banda, seus eventos, galeria de fotos e vídeos, e um canal de contato para shows.

## Estrutura do Projeto
O projeto é organizado da seguinte forma:

```
rock-na-veia-site
├── src
│   ├── index.html          # Página principal do site
│   ├── about.html          # História da banda e informações dos integrantes
│   ├── gallery.html        # Galeria de fotos e vídeos
│   ├── events.html         # Calendário de eventos
│   ├── contact.html        # Formulário de contato para shows
│   ├── components
│   │   ├── header.html     # Cabeçalho do site
│   │   └── footer.html     # Rodapé do site
│   ├── assets
│   │   ├── css
│   │   │   ├── main.css    # Estilos principais do site
│   │   │   └── responsive.css # Estilos responsivos
│   │   ├── js
│   │   │   ├── main.js     # Funcionalidades principais do site
│   │   │   ├── gallery.js   # Funcionalidades específicas da galeria
│   │   │   └── events.js    # Funcionalidades específicas do calendário de eventos
│   │   └── images          # Imagens utilizadas no site
│   └── data
│       ├── events.json     # Dados dos eventos
│       └── team.json       # Dados dos integrantes da banda
├── package.json            # Configuração do npm
├── .gitignore              # Arquivos a serem ignorados pelo controle de versão
└── README.md               # Documentação do projeto
```

## Funcionalidades
- **Página Sobre**: Apresenta a história da banda e informações sobre os integrantes.
- **Galeria**: Exibe fotos e vídeos de apresentações e ensaios.
- **Calendário de Eventos**: Mostra a agenda de shows com detalhes como data, local e links para compra de ingressos.
- **Contato para Shows**: Permite que contratantes entrem em contato com a banda através de um formulário.

## Como Executar o Projeto
1. Clone o repositório:
   ```
   git clone <URL do repositório>
   ```
2. Navegue até o diretório do projeto:
   ```
   cd rock-na-veia-site
   ```
3. Instale as dependências:
   ```
   npm install
   ```
4. Abra o arquivo `src/index.html` em um navegador para visualizar o site.

## Contribuições
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença
Este projeto é licenciado sob a MIT License.