(() => {
  const installBtn = document.getElementById("installAppBtn");
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) installBtn.addEventListener("click", async () => {
    if (!installPrompt) {
      showInstallHelp();
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    if (installBtn) installBtn.hidden = true;
    if (typeof window.showToast === "function") window.showToast("Zyon Cast instalado!");
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(err => console.warn("Service worker:", err)));
  }
  function showInstallHelp() {
    const msg = /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
      : "Use o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial.";
    if (typeof window.showToast === "function") window.showToast(msg);
    else alert(msg);
  }
})();