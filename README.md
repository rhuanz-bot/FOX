# Zyon Cast Pro

Aplicação web responsiva com instalação PWA, sinalização WebSocket e transmissão 1:1 via WebRTC.

## Requisitos
- Node.js 20+
- Navegador moderno (Chrome/Edge recomendados no PC; Android Chrome para instalação e testes)
- Hospedagem Node.js que mantenha WebSockets ativos

## Executar localmente
```bash
npm install
npm start
```
Abra `http://localhost:8080`. Para captura de tela, o navegador exige contexto seguro: `localhost` funciona para desenvolvimento; em produção use HTTPS.

## Publicar com link público
1. Envie a pasta do projeto para um repositório Git (por exemplo, GitHub).
2. Crie um serviço Web no Render ou plataforma equivalente com suporte a Node.js e WebSockets.
3. Configure build command vazio ou `npm install`, start command `npm start`, Node 20+.
4. Publique e abra o domínio HTTPS fornecido pela plataforma.
5. Teste `/healthz` — deve responder `{"ok":true,"service":"zyon-cast-pro"}`.
6. Abra o link no PC e no celular; crie/entre na mesma sala e conceda as permissões solicitadas.

**Importante:** o serviço precisa suportar conexões WebSocket persistentes. Hospedagem estática (por exemplo, só arquivos HTML) não é suficiente para o servidor de sinalização.

## Instalar
- **Android/Chrome:** abra o site HTTPS e use o menu ⋮ → Instalar app / Adicionar à tela inicial. Em navegadores compatíveis, aparece também o botão de instalação na barra superior.
- **Windows/Chrome ou Edge:** abra o site HTTPS e use o ícone Instalar na barra de endereço ou o menu do navegador.
- **iPhone/iPad:** abra no Safari → Compartilhar → Adicionar à Tela de Início. A instalação PWA funciona, mas a captura de tela no iOS tem restrições; para compartilhar tela do próprio iPhone, não prometa a mesma experiência do desktop.
- O service worker guarda apenas os arquivos estáticos da interface. Chamadas WebRTC e sinalização precisam de conexão com a internet.

## WebRTC: limitações e produção
- O projeto atual permite uma transmissão para um espectador por sala. O primeiro participante é o transmissor; o segundo, o espectador.
- WebRTC tenta conexão direta usando servidores STUN públicos. STUN não garante conectividade em todas as redes. Para confiabilidade real, configure um servidor TURN (por exemplo, coturn ou um provedor TURN gerenciado) e adicione credenciais temporárias à configuração ICE.
- Latência zero não existe; qualidade depende de rede, dispositivo, resolução e codec.
- Compartilhamento de tela com áudio do sistema depende do navegador, do sistema operacional e da opção escolhida na caixa de compartilhamento. O microfone é capturado separadamente.
- PWA não é um binário nativo APK/EXE. É um app instalável pelo navegador e pode ser empacotado futuramente se necessário.
- Não há ainda contas, banco de dados, persistência de perfil, chat, moderação ou salas em grupo. Perfis e GIFs são locais ao navegador.
- Antes de uso público, adicione autenticação/limites antiabuso, TURN gerenciado, observabilidade e política de privacidade. Não exponha credenciais TURN permanentes no frontend.
