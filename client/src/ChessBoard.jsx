import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { socket } from "./socket";

const gameOverSound = new Audio("/audio/game_over.webm");

export default function ChessBoard() {
    const [gameStatus, setGameStatus] = useState("waiting");
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState([]);
    const [playerRole, setPlayerRole] = useState(null);

    const [draggedPiece, setDraggedPiece] = useState(null);
    const [sourceSquare, setSourceSquare] = useState(null);

    const renderBoard = (fen) => {
        const game = new Chess(fen || chess.fen());
        setBoard(game.board());
    };

    useEffect(() => {
        socket.on("playerRole", (role) => {
            setPlayerRole(role);
            setGameStatus("waiting");
            renderBoard();
        });

        socket.on("spectatorRole", () => {
            setPlayerRole(null);
            setGameStatus("waiting");
            renderBoard();
        });

        socket.on("boardState", (fen) => {
            chess.load(fen);
            renderBoard(fen);
            setGameStatus("playing");
        });

        socket.on("gameOver", async () => {
            await gameOverSound.play().catch(() => { });
            setGameStatus("gameOver");
        });

        socket.on("draw", () => {
            setGameStatus("gameOver");
        });

        return () => socket.off();
    }, []);

    const handleMove = (from, to) => {
        socket.emit("move", {
            from,
            to,
            promotion: "q",
        });
    };

    // ♟️ Image-based pieces
    const getPieceImage = (piece) => {
        if (!piece) return null;
        const color = piece.color === "w" ? "w" : "b";
        const type = piece.type.toUpperCase();
        return `/pieces/${color}${type}.png`;
    };

    const isFlipped = playerRole === "b";

    const displayBoard =
        isFlipped
            ? [...board].reverse().map(row => [...row].reverse())
            : board;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">

            {/* Status */}
            <div className="mb-4 text-sm text-gray-700">
                {gameStatus === "waiting" && "Waiting for opponent"}
                {gameStatus === "playing" && "Game in progress"}
                {gameStatus === "gameOver" && "Game over"}
            </div>

            {/* Board */}
            <div className="grid grid-cols-8 border border-gray-400">
                {displayBoard.map((row, rowIndex) =>
                    row.map((square, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;

                        const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
                        const actualCol = isFlipped ? 7 - colIndex : colIndex;

                        return (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`w-14 h-14 flex items-center justify-center ${isLight ? "bg-gray-100" : "bg-gray-300"
                                    }`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                    if (!draggedPiece) return;

                                    const from =
                                        String.fromCharCode(97 + sourceSquare.col) +
                                        (8 - sourceSquare.row);

                                    const to =
                                        String.fromCharCode(97 + actualCol) +
                                        (8 - actualRow);

                                    handleMove(from, to);

                                    setDraggedPiece(null);
                                    setSourceSquare(null);
                                }}
                            >
                                {square && (
                                    <img
                                        src={getPieceImage(square)}
                                        alt=""
                                        className="w-10 h-10 cursor-grab"
                                        draggable={playerRole === square.color}
                                        onDragStart={() => {
                                            setDraggedPiece(square);
                                            setSourceSquare({
                                                row: actualRow,
                                                col: actualCol,
                                            });
                                        }}
                                        onDragEnd={() => {
                                            setDraggedPiece(null);
                                            setSourceSquare(null);
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
