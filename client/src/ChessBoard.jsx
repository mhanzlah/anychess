import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { socket } from "./socket";

const gameOverSound = new Audio("/audio/game_over.webm");

export default function ChessBoard() {
    const [gameStatus, setGameStatus] = useState("waiting");
    const [chess] = useState(new Chess());
    const [board, setBoard] = useState([]);
    const [playerRole, setPlayerRole] = useState(null);

    const [selectedSquare, setSelectedSquare] = useState(null); // { row, col }
    const [availableMoves, setAvailableMoves] = useState([]); // array of "e4", "d5", etc.

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

    const getPieceImage = (piece) => {
        if (!piece) return null;
        const color = piece.color === "w" ? "w" : "b";
        const type = piece.type.toUpperCase();
        return `/pieces/${color}${type}.png`;
    };

    const getSquareName = (row, col) => {
        return String.fromCharCode(97 + col) + (8 - row);
    };

    const handleSquareClick = (actualRow, actualCol, square) => {
        const squareName = getSquareName(actualRow, actualCol);

        // If a piece is already selected
        if (selectedSquare) {
            const fromSquare = getSquareName(selectedSquare.row, selectedSquare.col);

            // Clicking the same square → deselect
            if (fromSquare === squareName) {
                setSelectedSquare(null);
                setAvailableMoves([]);
                return;
            }

            // Clicking an available move target → execute move
            if (availableMoves.includes(squareName)) {
                handleMove(fromSquare, squareName);
                setSelectedSquare(null);
                setAvailableMoves([]);
                return;
            }

            // Clicking own piece → re-select it
            if (square && square.color === playerRole) {
                const moves = chess.moves({ square: squareName, verbose: true });
                setSelectedSquare({ row: actualRow, col: actualCol });
                setAvailableMoves(moves.map((m) => m.to));
                return;
            }

            // Clicking elsewhere → deselect
            setSelectedSquare(null);
            setAvailableMoves([]);
            return;
        }

        // No piece selected yet — select own piece
        if (square && square.color === playerRole) {
            const moves = chess.moves({ square: squareName, verbose: true });
            setSelectedSquare({ row: actualRow, col: actualCol });
            setAvailableMoves(moves.map((m) => m.to));
        }
    };

    const isFlipped = playerRole === "b";

    const displayBoard = isFlipped
        ? [...board].reverse().map((row) => [...row].reverse())
        : board;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">

            <div className="mb-4 text-sm text-gray-700">
                {gameStatus === "waiting" && "Waiting for opponent"}
                {gameStatus === "playing" && "Game in progress"}
                {gameStatus === "gameOver" && "Game over"}
            </div>

            <div className="grid grid-cols-8 border border-gray-400">
                {displayBoard.map((row, rowIndex) =>
                    row.map((square, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;

                        const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
                        const actualCol = isFlipped ? 7 - colIndex : colIndex;

                        const squareName = getSquareName(actualRow, actualCol);

                        const isSelected =
                            selectedSquare &&
                            selectedSquare.row === actualRow &&
                            selectedSquare.col === actualCol;

                        const isAvailable = availableMoves.includes(squareName);
                        const isCapture = isAvailable && !!square;

                        return (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`
                                    w-14 h-14 flex items-center justify-center relative cursor-pointer
                                    ${isLight ? "bg-gray-100" : "bg-gray-300"}
                                    ${isSelected ? "ring-2 ring-inset ring-yellow-400 brightness-110" : ""}
                                `}
                                style={{
                                    backgroundColor: isSelected
                                        ? isLight ? "#f6f669" : "#caca4a"
                                        : undefined,
                                }}
                                onClick={() => handleSquareClick(actualRow, actualCol, square)}
                            >
                                {/* Available move dot or capture ring */}
                                {isAvailable && !isCapture && (
                                    <div
                                        className="absolute rounded-full pointer-events-none z-10"
                                        style={{
                                            width: "33%",
                                            height: "33%",
                                            backgroundColor: "rgba(0,0,0,0.18)",
                                        }}
                                    />
                                )}
                                {isCapture && (
                                    <div
                                        className="absolute inset-0 rounded-none pointer-events-none z-10"
                                        style={{
                                            background:
                                                "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.18) 55%)",
                                        }}
                                    />
                                )}

                                {square && (
                                    <img
                                        src={getPieceImage(square)}
                                        alt=""
                                        className="w-10 h-10 relative z-20 select-none"
                                        draggable={false}
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