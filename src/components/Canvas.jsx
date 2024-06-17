import { useEffect, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import { getStroke } from 'perfect-freehand';
import { sqrt, pow } from 'mathjs';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const socket = io('ws://localhost:3000');

const generator = rough.generator();

const average = (a, b) => (a + b) / 2;

function getSvgPathFromStroke(points, closed = true) {
    const len = points.length;

    if (len < 4) {
        return ``;
    }

    let a = points[0];
    let b = points[1];
    const c = points[2];

    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
        2
    )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
        b[1],
        c[1]
    ).toFixed(2)} T`;

    for (let i = 2, max = len - 1; i < max; i++) {
        a = points[i];
        b = points[i + 1];
        result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
            2
        )} `;
    }

    if (closed) {
        result += 'Z';
    }

    return result;
}

const Canvas = () => {
    const [room, setRoom] = useState("")
    const [offset, setOffset] = useState(null);
    const [selection, setSelection] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [element, setElement] = useState([]);
    const [type, setType] = useState("pencil");
    const canvasRef = useRef(null);

    function calculateDistance(x1, y1, x2, y2) {
        return sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2));
    }

    function createElement(x1, y1, x2, y2, type2) {
        let roughElement;
        if (type === 'line') {
            roughElement = generator.line(x1, y1, x2, y2);
            let ind = element.length;
            return { ind, type, x1, y1, x2, y2, roughElement };
        } else if (type === "rectangle") {
            roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
            let ind = element.length;
            return { ind, type, x1, y1, x2, y2, roughElement };
        } else if (type === "pencil") {
            let ind = element.length;
            return { ind, type, points: [{ x: x1, y: y1 }] };
        } else {
            if (type2 === 'line') {
                roughElement = generator.line(x1, y1, x2, y2);
                let ind = element.length;
                return { ind, type: 'line', x1, y1, x2, y2, roughElement };
            } else if (type2 === 'rectangle') {
                roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
                let ind = element.length;
                return { ind, type: "rectangle", x1, y1, x2, y2, roughElement };
            }
        }
    }

    function drawElement(roughCanvas, context, item) {
        if (item.type === "line" || item.type === "rectangle") {
            roughCanvas.draw(item.roughElement);
        } else if (item.type === "pencil") {
            const myStroke = getSvgPathFromStroke(getStroke(item.points));
            context.fill(new Path2D(myStroke));
        }
    }

    useEffect(() => {

        socket.on("return-draw", ({ ele }) => {
            let newele = [...ele]
            setElement(newele);

        })
        return () => {
            socket.off("return-draw")
        }
    }, [])

    useEffect(() => {

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = 1300;
        canvas.height = 700;

        context.clearRect(0, 0, canvas.width, canvas.height);
        const roughCanvas = rough.canvas(canvas);

        element.forEach(item => {
            if (item != undefined && item != null && item.type != undefined)
                drawElement(roughCanvas, context, item);
        });
    }, [element]);

    const eraseTool = (clientX, clientY) => {
        let options = [];

        let donePencil = false;
        element.forEach((item, index) => {
            if (item != undefined) {


                const { type, x1, y1, x2, y2, points } = item;
                if (type === 'line') {
                    let originalDist = calculateDistance(x1, y1, x2, y2);
                    let dist1 = calculateDistance(x1, y1, clientX, clientY);
                    let dist2 = calculateDistance(clientX, clientY, x2, y2);

                    if (Math.abs(originalDist - (dist1 + dist2)) < 1) {
                        options.push({ index, area: 0 });
                    }
                } else if (type === 'pencil') {
                    if (!donePencil) {
                        points.map((p, i) => {
                            let dist1 = calculateDistance(p.x, p.y, clientX, clientY);
                            if (i + 1 <= points.length && points[i + 1] !== undefined) {

                                let originalDist = calculateDistance(points[i + 1].x, points[i + 1].y, p.x, p.y);
                                let dist2 = calculateDistance(points[i + 1].x, points[i + 1].y, clientX, clientY);

                                if (Math.abs(originalDist - (dist1 + dist2)) < 9) {
                                    options.push({ index, area: 0 });
                                    donePencil = true;
                                }
                            }
                        });
                    }
                } else if (type === 'rectangle') {
                    const minX = Math.min(x1, x2);
                    const maxX = Math.max(x1, x2);
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);

                    if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
                        const area = (maxX - minX) * (maxY - minY);
                        options.push({ index, area });
                    }
                }
            }
        });

        if (options.length > 0) {
            options.sort((a, b) => a.area - b.area);
            const indexToRemove = options[0].index;
            let ele = element.filter((_, i) => { return i !== indexToRemove });
            setElement(ele);
        }
    }

    const checkMousePoint = (clientX, clientY) => {
        let options = [];

        element.forEach((item, index) => {
            const { type, x1, y1, x2, y2, points } = item;
            if (type === 'line') {
                let originalDist = calculateDistance(x1, y1, x2, y2);
                let dist1 = calculateDistance(x1, y1, clientX, clientY);
                let dist2 = calculateDistance(clientX, clientY, x2, y2);

                if (Math.abs(originalDist - (dist1 + dist2)) < 1) {
                    options.push({ index, area: 0 });
                }
            } else if (type === 'pencil') {
                points.map((p, i) => {
                    let dist1 = calculateDistance(p.x, p.y, clientX, clientY);
                    if (i + 1 <= points.length && points[i + 1] !== undefined) {

                        let originalDist = calculateDistance(points[i + 1].x, points[i + 1].y, p.x, p.y);
                        let dist2 = calculateDistance(points[i + 1].x, points[i + 1].y, clientX, clientY);

                        if (Math.abs(originalDist - (dist1 + dist2)) < 9) {
                            let xOff = points.map(p => clientX - p.x);
                            let yOff = points.map(p => clientY - p.y);
                            options.push({ index, area: 0, xOff, yOff });
                        }
                    }
                });
            } else if (type === 'rectangle') {
                const minX = Math.min(x1, x2);
                const maxX = Math.max(x1, x2);
                const minY = Math.min(y1, y2);
                const maxY = Math.max(y1, y2);

                if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
                    const area = (maxX - minX) * (maxY - minY);
                    options.push({ index, area });
                }
            }
        });

        if (options.length > 0) {
            options.sort((a, b) => a.area - b.area);
            const selected = options[0];
            const selectedItem = element[selected.index];

            if (selectedItem.type === 'pencil') {
                setOffset({ offsetX: selected.xOff, offsetY: selected.yOff });
            } else {
                const { x1, y1 } = selectedItem;
                const offsetX = clientX - x1;
                const offsetY = clientY - y1;
                setOffset({ offsetX, offsetY });
            }
            setSelection(selected.index);
        } else {
            setSelection(null);
        }
    };

    const handleMouseDown = event => {
        setDrawing(true);
        const canvas = canvasRef.current;
        let rect = canvas.getBoundingClientRect();
        const { clientX, clientY } = event;
        const y = clientY - rect.top;
        const x = clientX - rect.left;

        if (type === 'erase') {
            eraseTool(x, y);
            return;
        }
        if (type === 'selection') {
            checkMousePoint(x, y);
            return;
        }

        if (selection != null) {
            document.body.style.cursor = 'crosshair';
        }
        const ele = createElement(x, y, x, y);
        setElement(() => [...element, ele]);
    };

    const handleMouseMove = (event) => {
        if (selection != null) {
            document.body.style.cursor = 'pointer';
        }
        if (!drawing) {
            return;
        } else if (type === 'selection') {
            if (selection != null) {
                if (element[selection].type === 'pencil') {
                    let { clientX, clientY } = event;
                    const canvas = canvasRef.current;
                    let rect = canvas.getBoundingClientRect();

                    let { offsetX, offsetY } = offset;

                    let newPoints = element[selection].points.map((_, i) => {
                        return {
                            x: clientX - rect.left - offsetX[i],
                            y: clientY - rect.top - offsetY[i]
                        };
                    });

                    const elementsCopy = [...element];
                    elementsCopy[selection] = { ...element[selection], points: newPoints };
                    setElement(elementsCopy);
                } else {
                    let { clientX, clientY } = event;
                    const canvas = canvasRef.current;
                    let rect = canvas.getBoundingClientRect();

                    let { offsetX, offsetY } = offset;
                    let newX = clientX - rect.left - offsetX;
                    let newY = clientY - rect.top - offsetY;
                    let { type, x1, y1, x2, y2 } = element[selection];

                    const ele = createElement(newX, newY, newX + x2 - x1, newY + y2 - y1, type);
                    ele.ind = selection;
                    const elementsCopy = [...element];
                    elementsCopy[selection] = ele;
                    setElement(elementsCopy);
                }
            }
            return;
        } else if (type === 'pencil') {
            const canvas = canvasRef.current;
            let rect = canvas.getBoundingClientRect();

            const newX = event.clientX - rect.left;
            const newY = event.clientY - rect.top;
            let ind = element.length - 1;
            let lastele = element[ind];
            const elementsCopy = [...element];

            lastele.points.push({ x: newX, y: newY });
            elementsCopy[ind] = { ...lastele };
            setElement(elementsCopy);
        } else {
            const canvas = canvasRef.current;
            let rect = canvas.getBoundingClientRect();
            const { clientX, clientY } = event;
            const y = clientY - rect.top;
            const x = clientX - rect.left;

            let ind = element.length - 1;
            let lastele = element[ind];
            const ele = createElement(lastele.x1, lastele.y1, x, y);

            const elementsCopy = [...element];
            elementsCopy[ind] = ele;
            setElement(elementsCopy);
        }
    };

    const handleMouseUp = () => {
        if (selection != null) {
            document.body.style.cursor = 'default';
        }
        setSelection(null);
        setDrawing(false);
        socket.emit('draw', { ele: element, room: room });
        socket.off('draw');
    };

    const handleDrawingChange = (e) => {
        setType(e.target.value);
    };

    const clearCanvas = () => {
        setElement([]);
        socket.emit('draw', { ele: [], room: room });
        socket.off('draw');
    }

    const handleRoom = (d) => {
        try {
            socket.emit("join-room", d)
            setRoom(d)
            toast.dark(`Room ${d} joined`)
        } catch (error) {
            toast.error("Error joining room")
            console.log("Error in joining room: ", error)
        }
    }

    return (
        <div className="h-screen w-screen bg-gray-900 text-white flex flex-col items-center">
            <ToastContainer />
            <div className="flex my-5 space-x-12 items-center justify-around">
                <div>
                    <label htmlFor="drawType" className="mr-2 text-gray-300">Select Type:</label>
                    <select
                        id="drawType"
                        onChange={e => handleDrawingChange(e)}
                        className="bg-gray-800 text-gray-300 border border-gray-700 rounded p-2"
                    >
                        <option value="pencil">Pencil</option>
                        <option value="line">Line</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="selection">Selection</option>
                        <option value="erase">Erase</option>
                    </select>
                </div>
                <button
                    onClick={() => clearCanvas()}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Clear
                </button>
                <div>

                    <form
                        onSubmit={(e) => {
                            handleRoom(e.target.roomname.value);
                            e.preventDefault();
                            e.target.roomname.value = ""
                        }}
                    >
                        <input
                            type="text"
                            name="roomname"
                            className="mx-3 bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            placeholder="Enter room name"
                        />
                        <button
                            type="submit"
                            className="bg-sky-600 hover:bg-sky-800 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
                        >
                            Room
                        </button>
                    </form>

                </div>
            </div>
            <canvas
                ref={canvasRef}
                className="bg-gray-400 border border-gray-700 rounded"
                onMouseUp={handleMouseUp}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            />
        </div >
    );
};

export default Canvas;
