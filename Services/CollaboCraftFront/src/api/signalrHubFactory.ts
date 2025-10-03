import * as signalR from '@microsoft/signalr';

interface HubInstance {
  connection: signalR.HubConnection;
  isConnecting: boolean;
}

class SignalRHubFactory {
  private hubs: Map<string, HubInstance> = new Map();

  public createHub(url: string, tokenKey = 'accessToken'): HubInstance {
    if (this.hubs.has(url)) {
      return this.hubs.get(url)!;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => localStorage.getItem(tokenKey) || '',
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    const instance: HubInstance = { connection, isConnecting: false };

    connection.onclose(() => console.warn(`[SignalR] ${url} closed`));
    connection.onreconnecting(() => console.log(`[SignalR] ${url} reconnecting...`));
    connection.onreconnected(() => console.log(`[SignalR] ${url} reconnected`));

    this.hubs.set(url, instance);
    return instance;
  }

  public async startHub(url: string) {
    const hub = this.hubs.get(url);
    if (!hub) throw new Error(`Hub ${url} not found`);
    if (hub.isConnecting || hub.connection.state !== signalR.HubConnectionState.Disconnected) return;

    hub.isConnecting = true;
    try {
      await hub.connection.start();
      console.log(`[SignalR] ${url} connected`);
    } catch (err) {
      console.error(`[SignalR] ${url} connection error:`, err);
    } finally {
      hub.isConnecting = false;
    }
  }

  public async stopHub(url: string) {
    const hub = this.hubs.get(url);
    if (!hub) return;
    if (hub.connection.state === signalR.HubConnectionState.Connected) {
      await hub.connection.stop();
      console.log(`[SignalR] ${url} disconnected`);
    }
  }

  public async sendMessage(url: string, method: string, args: any[]) {
    const hub = this.hubs.get(url);
    if (!hub) throw new Error(`Hub ${url} not found`);
    return hub.connection.invoke(method, ...args);
  }
}

export const hubFactory = new SignalRHubFactory();
