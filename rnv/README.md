# Site Rock na Véia

Site estático para o **GitHub Pages**. Fotos, vídeos e posts são publicados direto pelo site do GitHub, sem instalar nada. Uma automação (GitHub Actions) cuida do resto.

## 1. Publicar pela primeira vez (uma vez só)
1. Crie uma conta no GitHub (use um e-mail da banda) e clique em **New repository**. Dê o nome `rocknaveia`, deixe **Public** e crie.
2. Na página do repositório, clique em **uploading an existing file** e arraste **todo o conteúdo** da pasta descompactada. Atenção: a pasta `.github` precisa subir junto (se o seu sistema esconder pastas com ponto, use o GitHub Desktop ou arraste a pasta inteira de uma vez). Clique em **Commit changes**.
3. Vá em **Settings → Pages**. Em **Source**, escolha **GitHub Actions**.
4. Abra a aba **Actions** e aguarde o ✅ verde (cerca de 1 minuto). O endereço do site aparece em **Settings → Pages**: `https://SEU-USUARIO.github.io/rocknaveia/`.

Depois disso, **toda alteração publica sozinha** em cerca de 1 minuto.

## Página de administração (jeito mais fácil)
Acesse `https://SEU-USUARIO.github.io/rocknaveia/admin/` (guarde nos favoritos do celular). Lá você envia fotos (várias de uma vez, direto da galeria do celular), cria e exclui álbuns, adiciona vídeos do YouTube e escreve posts, sem abrir o GitHub.

**Criar o código de acesso (uma vez só):**
1. No GitHub, clique na sua foto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Nome: `site da banda`. Validade: 1 ano. Em **Repository access**, escolha **Only select repositories** e marque o repositório do site.
3. Em **Permissions → Repository permissions**, coloque **Contents: Read and write**. Clique em **Generate token** e copie o código (ele só aparece uma vez).
4. Na página `/admin/`, digite `usuario/nome-do-repositorio` e cole o código. Ele fica salvo só naquele aparelho. Quem não tem o código não consegue alterar nada.

Quando o código vencer, gere outro do mesmo jeito. Não compartilhe o código com ninguém de fora da banda.

## 2. Publicar fotos (manual, pelo GitHub)
1. No repositório, abra a pasta `fotos`.
2. Clique em **Add file → Upload files**. Para um álbum novo, digite o nome da pasta no caminho, por exemplo `fotos/2026-11-07-show-bar-do-ze/` (use este formato: **data-nome-com-hifens**). A data vira a data do álbum e o resto vira o título.
3. Arraste as fotos (pode ser várias, direto do celular) e clique em **Commit changes**.

As fotos são redimensionadas automaticamente. A primeira foto (ordem alfabética do nome do arquivo) vira a capa. Para apagar, entre no arquivo e use o ícone da lixeira.

Apague a pasta `exemplo-primeiro-album` quando subir as suas.

## 3. Publicar vídeos (manual)
Abra o arquivo `videos.txt`, clique no lápis ✏️ e adicione uma linha:

`https://www.youtube.com/watch?v=XXXXXXXXXXX | Título do vídeo | 2026-11-07`

Links do **YouTube** abrem dentro do site, com miniatura. Para vídeos, suba no YouTube (gratuito) e cole o link aqui.

## 4. Publicar posts (manual)
Na pasta `posts`, clique em **Add file → Create new file** e crie um arquivo chamado `AAAA-MM-DD-titulo.md`, por exemplo `2026-11-10-show-lotado.md`:

```
# Título do post
Texto do post. Pode escrever vários parágrafos.
```

Clique em **Commit changes**. Para editar ou apagar, abra o arquivo.

## Se as fotos, posts e vídeos não aparecem
O site só mostra esse conteúdo depois que a automação roda. Confira:
1. **Settings → Pages → Source** precisa estar em **GitHub Actions** (não "Deploy from a branch").
2. Na aba **Actions**, o último item deve estar com ✅. Se estiver com ❌, abra-o para ver o erro. Se não houver nada, a pasta `.github` não foi enviada: suba-a de novo.
3. Em **Settings → Actions → General → Workflow permissions**, deixe habilitado.
4. Abra o endereço `https://SEU-USUARIO.github.io/rocknaveia/` (e não o arquivo `index.html` direto do computador, que não carrega o conteúdo). Aperte Ctrl+F5 para limpar o cache.
5. A seção Agenda mostra shows de exemplo até você preencher o `config.js`.

## 5. Agenda de shows (Google Agenda)
Sem configurar, o site mostra shows de exemplo. Para ligar à agenda da banda:
1. Em calendar.google.com, crie uma agenda só da banda. Em **Configurações da agenda → Permissões de acesso**, marque **Disponibilizar para o público**.
2. Em **Integrar agenda**, copie o **ID da agenda**.
3. Em console.cloud.google.com, crie um projeto, ative a **Google Calendar API** e crie uma **Chave de API**. Em restrições, limite a chave ao seu site (`https://SEU-USUARIO.github.io/*`).
4. No GitHub, edite `config.js` e preencha `calendarId` e `apiKey`.

Depois, basta criar o evento no Google Agenda, com título, data/hora e **local** (o botão "Como chegar" usa o local). Só aparecem eventos com horário definido e que ainda não passaram.

## 6. Textos, contatos e integrantes
Estão no arquivo `index.html`. Busque o texto (Ctrl+F no editor do GitHub) e altere. WhatsApp (11 98713-5885), e-mail (oficialrocknaveia@gmail.com) e Instagram (@rocknaveiaoficial) ficam na seção "Contrate a banda", no rodapé e no botão flutuante do WhatsApp. O texto da mensagem automática está dentro do link `wa.me`, depois de `?text=`.

## Estrutura
`index.html` (página) · `config.js` (agenda) · `assets/` (logos e script) · `fotos/` · `posts/` · `videos.txt` · `build.py` e `.github/workflows/publicar.yml` (automação; não precisa mexer).

## Testar no computador (opcional)
`pip install pillow && python build.py && python -m http.server -d _site`
