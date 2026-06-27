# NetNode Chat

Simulador de red informática para el aula. Los docentes crean salas con topologías de red configurables y los alumnos se unen como "nodos" que envían mensajes entre sí siguiendo rutas de shortest-path.

---

## Para qué sirve

- **Docentes**: Crean una sala con una topología de red (cadena, anillo, estrella, árbol, malla, etc.), comparten el código con los alumnos y monitorean todos los chats en tiempo real.
- **Alumnos**: Se unen a la sala con el código, se conectan con sus compañeros y envían mensajes que viajan por la red siguiendo la topología configurada.

Simula cómo viajan los paquetes de datos en una red real, mostrando visualmente el recorrido de cada mensaje.

---

## Cómo se utiliza

### Como docente

1. Abrí la aplicación en el navegador
2. Ingresá tu nombre, el nombre del grupo y seleccioná una topología de red
3. Hacé clic en **Crear sala**
4. Compartí el código de 4 dígitos o el enlace con tus alumnos
5. Monitoreá los chats en tiempo real desde el dashboard
6. Podés cambiar la topología en cualquier momento

### Como alumno

1. Abrí el enlace que te dio el docente (o ingresá el código de 4 dígitos)
2. Ingresá tu nombre
3. Hací clic en **Unirse**
4. Seleccioná un contacto de la lista y enviá mensajes
5. Visualizá cómo los paquetes viajan por la red en el canvas

### Funcionalidades

| Función | Descripción |
|---------|-------------|
| **Topologías** | 10 tipos: cadena, anillo, estrella, árbol, malla parcial, malla completa, small-world, scale-free, aleatoria, cuadrícula |
| **Ruteo BFS** | Los mensajes siguen la ruta más corta entre nodos |
| **Animación de paquetes** | Visualización en tiempo real del recorrido del mensaje |
| **Monitoreo** | El docente ve todos los pares de chat y puede inspeccionar cualquier conversación |
| **Toggle de nodos** | Los alumnos pueden apagar/apagar su nodo, simulando caídas |
| **Dark/Light mode** | Se adapta automáticamente al tema del sistema |

---

## Estructura del proyecto

```
netnode-chat/
├── client/                     # Frontend (browser)
│   ├── domain/                 # Entidades y lógica de negocio
│   │   ├── Node.js             # Nodo de la red
│   │   ├── Edge.js             # Conexión entre nodos
│   │   ├── Camera.js           #Viewport y coordenadas
│   │   ├── Network.js          # Grafo del lado del cliente
│   │   ├── layout.js           # Cálculo de posiciones por topología
│   │   └── pathfinding.js      # BFS shortest-path
│   ├── application/            # Casos de uso
│   │   ├── SendMessage.js      # Enviar mensaje
│   │   ├── ReceiveMessage.js   # Almacenar mensajes recibidos
│   │   ├── SentMessage.js      # Almacenar mensajes enviados
│   │   ├── ToggleNode.js       # Prender/apagar nodo
│   │   └── MessageTransport.js # Interfaz de comunicación (DIP)
│   ├── infrastructure/         # Adaptadores externos
│   │   ├── NetworkClient.js    # Cliente Socket.io
│   │   └── CanvasAdapter.js    # Adaptador del canvas DOM
│   ├── presentation/           # UI y renderizado
│   │   ├── CanvasRenderer.js   # Renderiza la red en el canvas del alumno
│   │   ├── TeacherDashboard.js # Dashboard del docente
│   │   ├── ChatPanel.js        # Panel de chat del alumno
│   │   ├── NodeRenderer.js     # Renderizado de nodos (compartido)
│   │   └── PacketAnimator.js   # Animación de paquetes (compartido)
│   ├── App.js                  # Orquestador principal del cliente
│   └── entry.js                # Punto de entrada
├── server/                     # Backend (Node.js)
│   ├── domain/                 # Entidades y lógica de negocio
│   │   ├── Room.js             # Sala con nodos, edges y mensajes
│   │   ├── RoomManager.js      # Registro de salas activas
│   │   ├── TopologyBuilder.js  # Construcción de topologías
│   │   ├── MessageLog.js       # Registro de mensajes
│   │   └── pathfinding.js      # BFS shortest-path (servidor)
│   ├── infrastructure/         # Adaptadores externos
│   │   └── SocketServer.js     # Servidor Socket.io + Express
│   └── index.js                # Punto de entrada del servidor
├── sounds.js                   # Efectos de sonido (Web Audio API)
├── style.css                   # Estilos (light/dark mode)
├── index.html                  # Shell HTML de la aplicación
└── PLAN-redis-integration.md   # Plan de escalabilidad con Redis
```

### Arquitectura Clean Architecture

El proyecto sigue los principios de **Clean Architecture** con separación en capas:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (browser)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Presentation │→│ Application  │→│    Domain      │  │
│  │  (UI/Canvas) │  │ (Use Cases) │  │ (Entidades)   │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│         ↑                                                │
│  ┌─────────────┐                                        │
│  │Infrastructure│ (Socket.io Client, CanvasAdapter)     │
│  └─────────────┘                                        │
└─────────────────────────┬───────────────────────────────┘
                          │ WebSocket
┌─────────────────────────┴───────────────────────────────┐
│                    SERVIDOR (Node.js)                    │
│  ┌─────────────┐  ┌──────────────┐                      │
│  │Infrastructure│→│    Domain     │                      │
│  │ (SocketServer)│ │ (Room, etc) │                      │
│  └─────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Reglas de dependencia:**
- `Domain` no depende de nada externo
- `Application` depende solo de `Domain`
- `Infrastructure` implementa interfaces del `Domain`
- `Presentation` depende de `Application` + `Domain`
- Las flechas van hacia adentro (hacia el Domain)

---

## Tecnologías

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Node.js** | LTS | Runtime del servidor |
| **Express** | ^4.18.2 | Servidor HTTP + archivos estáticos |
| **Socket.io** | ^4.7.2 | Comunicación WebSocket cliente-servidor |
| **ES Modules** | - | Sistema de módulos (`"type": "module"`) |
| **Canvas API** | - | Renderizado de la red en el navegador |
| **Web Audio API** | - | Efectos de sonido |

---

## Ejecución local

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd netnode-chat

# Instalar dependencias del servidor
cd server
npm install

# Iniciar el servidor
npm start

# Abrir en el navegador
# http://localhost:3000
```

---

## Escalabilidad

El proyecto actual funciona para **5-10 salas simultáneas con 30 alumnos cada una**. Para escalar, ver el plan de integración de Redis en `PLAN-redis-integration.md`.

| Métrica | Capacidad actual |
|---------|------------------|
| Salas simultáneas | ~20 (limitado por lookups O(R×N)) |
| Alumnos por sala | 30 (limitado por el alfabeto de labels) |
| Mensajes por sala | Ilimitado (pero sin persistencia) |
| Memoria por sala | ~16-49 KB (sin mensajes) |
| Persistencia | ❌ In-memory (se pierde al reiniciar) |
