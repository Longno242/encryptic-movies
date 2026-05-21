const discordRpc = require("../discordRpc");

function register() {
  const { ipcMain } = require("electron");

  ipcMain.handle("discord-rpc-set-enabled", (_, enabled) => {
    discordRpc.setEnabled(!!enabled);
    if (enabled) {
      discordRpc.setBrowsing().catch(() => {});
    } else {
      discordRpc.clearActivity();
    }
    return { ok: true };
  });

  ipcMain.handle("discord-rpc-set-config", (_, config) => {
    discordRpc.setConfig(config);
    if (discordRpc.isEnabled()) {
      discordRpc.setBrowsing().catch(() => {});
    }
    return { ok: true };
  });

  ipcMain.handle("discord-rpc-update", (_, payload) => {
    discordRpc.setActivity(payload);
    return { ok: true };
  });

  ipcMain.handle("discord-rpc-clear", () => {
    discordRpc.clearActivity();
    return { ok: true };
  });

  ipcMain.handle("discord-rpc-browsing", (_, context) => {
    discordRpc.setBrowsing(context || {});
    return { ok: true };
  });
}

module.exports = { register, discordRpc };
