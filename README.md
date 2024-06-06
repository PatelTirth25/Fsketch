# Fsketch

Fsketch is a collaborative drawing application built using Vite, React JS, Tailwind CSS, and Node.js. It provides a simple canvas for drawing, where friends can join rooms and draw together in real-time using WebSockets. The application also supports solo drawing sessions.

## Features

- **Collaborative Drawing**: Multiple users can draw on the same canvas simultaneously by joining rooms.
- **Solo Drawing**: Users can draw independently without joining a room.
- **Drawing Tools**:
  - Line tool
  - Rectangle tool
  - Pencil tool
  - Eraser tool
  - Clear all drawings 

## Limitations

- Fsketch does not support small screens. For the best experience, use it on a desktop or laptop.

## Installation

To set up Fsketch locally, follow these steps:

1. **Clone the repository**:
    ```bash
    git clone https://github.com/PatelTirth25/Fsketch.git
    cd fsketch
    ```

2. **Install frontend dependencies**:
    ```bash
    npm install
    ```

3. **Install backend dependencies**:
    ```bash
    cd ./server
    npm install
    ```

## Running the Application

1. **Start the backend server**:
    ```bash
    cd server
    nodemon socket.js
    ```

2. **Start the frontend development server**:
    ```bash
    cd ..
    npm run dev
    ```

    The frontend will be available at `http://localhost:5173`.

## Technologies Used

- **Frontend**:
  - Vite
  - React JS
  - Tailwind CSS

- **Backend**:
  - Node.js
  - WebSockets

## Usage

1. Open your browser and navigate to `http://localhost:5173`.
2. Choose to create a new room or join an existing room to start drawing with friends.
3. Use the drawing tools available to create your artwork.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

---

Happy Drawing! 😁
