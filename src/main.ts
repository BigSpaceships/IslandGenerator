import './style.css';
// import { log } from './logger';

const svgElement = document.getElementsByTagName('svg')[0];

const radius = 5;
const drag = 0.7;
const gravity = .5;
const tossSpeed = 75;

function addVectors(a: Vector, b: Vector): Vector {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    };
}

function subVectors(a: Vector, b: Vector): Vector {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    };
}

function vectorMagnitude(a: Vector): number {
    const horizontalLength = Math.sqrt(a.x * a.x + a.y * a.y);

    return Math.sqrt(horizontalLength * horizontalLength + a.z * a.z);
}

type Vector = {
    x: number;
    y: number;
    z: number;
};

type Bean = {
    pos: Vector;
    lastPos: Vector;
    posChange: Vector;
};

function generateBeanBlob(count: number, width: number, height: number, xOffset = width / 2, yOffset = height / 2, zOffset = 50): Bean[] {
    let beanArray = [] as Bean[];

    for (let i = 0; i < count; i++) {
        
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50;

        const horizontalLength = Math.sin(phi) * distance;

        const newPos: Vector = {
            x: xOffset + Math.cos(theta) * horizontalLength,
            y: yOffset + Math.sin(theta) * horizontalLength,
            z: zOffset + Math.cos(phi) * distance,
        };

        const lastPos: Vector = {
            x: newPos.x + Math.random() * tossSpeed - tossSpeed / 2,
            y: newPos.y + Math.random() * tossSpeed - tossSpeed / 2,
            z: newPos.z,
        }

        const newBean: Bean = {
            pos: newPos,
            lastPos: lastPos,
            posChange: { x: 0, y: 0, z: 0 },
        };

        beanArray.push(newBean);
    }

    return beanArray;
}

function simulateBeans(beans: Bean[]): Bean[] {
    for (let i = 0; i < beans.length; i++) {
        beans[i].posChange = { x: 0, y: 0, z: 0 };
    }

    for (let i = 0; i < beans.length; i++) {
        const oldPos = beans[i].pos;

        beans[i].pos = addVectors(beans[i].pos, {
            x: (beans[i].pos.x - beans[i].lastPos.x) * drag,
            y: (beans[i].pos.y - beans[i].lastPos.y) * drag,
            z: (beans[i].pos.z - beans[i].lastPos.z) * drag,
        });

        beans[i].pos = addVectors(beans[i].pos, {
            x: 0,
            y: 0,
            z: -gravity,
        });

        if (beans[i].pos.z < radius) {
            beans[i].pos = {
                x: beans[i].pos.x,
                y: beans[i].pos.y,
                z: radius,
            };
        }

        for (let compareIndex = i + 1; compareIndex < beans.length; compareIndex++) {
            const relativeVector = subVectors(beans[i].pos, beans[compareIndex].pos);
            const distance = vectorMagnitude(relativeVector);
    
            // log(distance);

            if (distance > radius * 2) {
                continue;
            }

            const relativeVectorNormalizedHalved: Vector = {
                x: (relativeVector.x / distance / 2) * radius,
                y: (relativeVector.y / distance / 2) * radius,
                z: (relativeVector.z / distance / 2) * radius,
            };

            beans[i].posChange = addVectors(
                beans[i].posChange,
                relativeVectorNormalizedHalved
            );

            beans[compareIndex].posChange = addVectors(beans[compareIndex].posChange,
                {
                    x: -relativeVectorNormalizedHalved.x,
                    y: -relativeVectorNormalizedHalved.y,
                    z: -relativeVectorNormalizedHalved.z,
                }
            );
        }

        beans[i].pos = addVectors(beans[i].pos, beans[i].posChange);

        beans[i].lastPos = oldPos;
    }

    return beans;
}

function drawBeans(beans: Bean[]): void {
  while (svgElement.lastChild) {
    svgElement.removeChild(svgElement.lastChild);
  }

  beans.forEach((bean: Bean) => {
    const newCircleElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );

    newCircleElement.setAttribute('r', radius.toString());
    newCircleElement.setAttribute('cx', bean.pos.x.toString());
    newCircleElement.setAttribute('cy', bean.pos.y.toString());

    const zColor = bean.pos.z * 3;
    newCircleElement.setAttribute(
      'fill',
      `rgb(${zColor}, ${zColor}, ${zColor})`
    );

    svgElement.appendChild(newCircleElement);
  });
}

function generateIsland() {
    let beans = generateBeanBlob(Math.random() * 250, window.innerWidth, window.innerHeight);

    drawBeans(beans);

    for (let i = 0; i < 4; i++) {
        const theta = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 75;
        const newBeans = generateBeanBlob(
            Math.random() * 50 + 25,
            window.innerWidth, window.innerHeight,
            Math.cos(theta) * distance + window.innerWidth / 2,
            Math.sin(theta) * distance + window.innerHeight / 2
        );
        // console.log(beans.length);
        beans = beans.concat(newBeans);
    }

    // drawBeans(beans);

    window.setInterval(() => {
        beans = simulateBeans(beans);

        drawBeans(beans);
    }, 1);
}

generateIsland();
