import './style.css';
// import { log } from './logger';

const svgElement = document.getElementsByTagName('svg')[0];
const circleParentElement = document.getElementById("circle-group");
const pathParentElement = document.getElementById("path-group");

const radius = 5;
const drag = 0.7;
const gravity = .5;
const tossSpeed = 75;

let intervalID: number;

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

type Arc = {
    pos1: Vector;
    pos2: Vector;
    direction: number;
    large: number;
}



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

    let movingBeans = 0;
    
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

        // console.log(beans[i].pos.z)
        
        if (vectorMagnitude(beans[i].posChange) > 0 || beans[i].pos.z != radius) {
            movingBeans++;
        }

        beans[i].lastPos = oldPos;
    }

    if (movingBeans == 0) {
        finishMoving(beans);
    }
    
    return beans;
}

function drawBeans(beans: Bean[]): void {
  while (circleParentElement?.lastChild) {
    circleParentElement.removeChild(circleParentElement.lastChild);
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

    circleParentElement?.appendChild(newCircleElement);
  });
}

function drawOutlineForBeans(beans: Bean[]): void {
    drawBeans(beans);
    
    const firstBean = beans[0].pos;
    const secondBean = beans[1].pos;
    const vectorBetween = subVectors(firstBean, secondBean);

    const distanceSquared = ((firstBean.x - secondBean.x) * (firstBean.x - secondBean.x) + (firstBean.y - secondBean.y) * (firstBean.y - secondBean.y)) / 4;
    const distanceToPoints = Math.sqrt(10 * 10 - distanceSquared);

    const slope = -vectorBetween.x / vectorBetween.y;

    const xChange = Math.sqrt(distanceToPoints * distanceToPoints / (1 + slope * slope));

    const firstIntersectionPos = {
        x: (firstBean.x + secondBean.x) / 2 + xChange,
        y: (firstBean.y + secondBean.y) / 2 + slope * xChange,
        z: 0,
    }

    const secondIntersectionPos = {
        x: (firstBean.x + secondBean.x) / 2 - xChange,
        y: (firstBean.y + secondBean.y) / 2 - slope * xChange,
        z: 0,
    }

    let pathInstructions: string[] = [] as string[];

    pathInstructions.push(`M ${firstIntersectionPos.x} ${firstIntersectionPos.y}`);
    pathInstructions.push(`A 10 10 0 1 0 ${secondIntersectionPos.x} ${secondIntersectionPos.y}`);
    pathInstructions.push(`A 10 10 0 1 0 ${firstIntersectionPos.x} ${firstIntersectionPos.y}`);

    const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathElement.setAttribute("d", pathInstructions.join(' '));

    pathParentElement?.appendChild(pathElement)
    
}

function getExtraDistance(beans: Bean[], bean: Bean, indexToAdd: number): number {
    const firstBean: Bean = beans[indexToAdd];

    const secondBean: Bean = indexToAdd == beans.length ? beans[0] : beans[indexToAdd];

    const distance = vectorMagnitude(subVectors(firstBean.pos, secondBean.pos));

    const distBetweenFirstAndMid = vectorMagnitude(subVectors(firstBean.pos, bean.pos));

    const distBetweenMidAndSecond = vectorMagnitude(subVectors(secondBean.pos, bean.pos));

    return distBetweenMidAndSecond + distBetweenFirstAndMid - distance;
}

function shortestPath(group: Bean[]) {
    
    const usedBeans = [group[0], group[1]];

    for (let i = 2; i < group.length; i++) {
        const pos = [...Array(usedBeans.length).keys()] // array from 0 ... usedBeans.length - 1
            .reduce((shortest, test) => { // indices
            return getExtraDistance(usedBeans, group[i], shortest) < getExtraDistance(usedBeans, group[i], test) ? shortest : test;
        })

        usedBeans.splice(pos, 0, group[i])
    }

    return usedBeans;
}

function trimArcs(arcs: Arc[])

function drawGroup(group: Bean[]): void {
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const arcs = [] as Arc[];
    // const usedBeans = shortestPath(group);
    const closeEnoughBeans: number[][] = [[]] as number[][];

    for (let i = 0; i < group.length; i++) {
        closeEnoughBeans.push([])
        for (let j = i; j < group.length; j++) {
            if (i == j) continue;

            if (vectorMagnitude(subVectors(group[i].pos, group[j].pos)) < 20) {
                closeEnoughBeans[i].push(j);
            }
        }
    }

    const arcsForBean: number[][] = [[]] as number[][];

    for (let i = 0; i < group.length; i++) {
        arcsForBean.push([])
    }

    for (let i = 0; i < group.length; i++) {
        for (let j = 0; j < closeEnoughBeans[i].length; j++) {
            const firstBean = group[i].pos;
            const secondBean = group[closeEnoughBeans[i][j]].pos;
            const vectorBetween = subVectors(firstBean, secondBean);

            const distanceSquared = ((firstBean.x - secondBean.x) * (firstBean.x - secondBean.x) + (firstBean.y - secondBean.y) * (firstBean.y - secondBean.y)) / 4;
            const distanceToPoints = Math.sqrt(10 * 10 - distanceSquared);

            const slope = -vectorBetween.x / vectorBetween.y;

            const xChange = Math.sqrt(distanceToPoints * distanceToPoints / (1 + slope * slope));

            const firstIntersectionPos = {
                x: (firstBean.x + secondBean.x) / 2 + xChange,
                y: (firstBean.y + secondBean.y) / 2 + slope * xChange,
                z: 0,
            }

            const secondIntersectionPos = {
                x: (firstBean.x + secondBean.x) / 2 - xChange,
                y: (firstBean.y + secondBean.y) / 2 - slope * xChange,
                z: 0,
            }

            const arc1: Arc = {
                pos1: firstIntersectionPos,
                pos2: secondIntersectionPos,
                direction: 0,
                large: 1,
            }

            const arc2: Arc = {
                pos1: secondIntersectionPos,
                pos2: firstIntersectionPos,
                direction: 0,
                large: 1,
            }

            const index1 = arcs.length;
            const index2 = arcs.length + 1;

            arcs.push(arc1, arc2)

            arcsForBean[i].push(index1, index2);
            arcsForBean[closeEnoughBeans[i][j]].push(index1, index2);
        }
    }
    
    let pathString: string[] = [] as string[];

    pathString.push(`M ${arcs[0].pos1.x} ${arcs[0].pos1.y}`);

    for (let i = 1; i < arcs.length; i++) {
        const arc = arcs[i];

        pathString.push(`M ${arc.pos1.x} ${arc.pos1.y}`)
        pathString.push(`A 10 10 0 ${arc.large} ${arc.direction} ${arc.pos2.x} ${arc.pos2.y}`);
    }

    // pathString.push(`L ${points[0].x} ${points[0].y}`);

    pathEl.setAttribute("d", pathString.join(' '))

    pathParentElement?.appendChild(pathEl);
}

function finishMoving(beans: Bean[]) {
    window.clearInterval(intervalID);

    console.log("done")

    let groups: Bean[][] = [[]] as Bean[][];

    beans.sort((a, b) => {
        const aMag = vectorMagnitude(a.pos);
        const bMag = vectorMagnitude(b.pos);

        if (aMag > bMag) {
            return 1;
        }

        if (aMag < bMag) {
            return -1;
        }

        return 0;
    })

    groups[0].push(beans[0]);

    // console.log(groups.length)
    
    for (let i = 1; i < beans.length; i++) {
        let newIndex = -1;
        
        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            let add = false;
            for(let j = 0; j < groups[groupIndex].length; j++) {
                // console.log
                let distance = vectorMagnitude(subVectors(beans[i].pos, groups[groupIndex][j].pos))

                if (distance < 20) {
                    add = true;
                }
            }

            if (add) {
                newIndex = groupIndex;
            }
        }

        if (newIndex == -1) {
            groups.push([beans[i]]);
        } else {
            groups[newIndex].push(beans[i]);
        }
    }

    const largestGroup = groups.reduce((largest, other) => {
        return largest.length > other.length ? largest : other;
    })

    console.log(largestGroup)

    drawBeans(largestGroup);
    drawGroup(largestGroup);
    
    // groups.forEach((group: Bean[]) => {
    //     drawGroup(group);
    // })
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

    const firstBean: Bean = {
        pos: {
                x: 25,
                y: 25,
                z: 0
            },
        lastPos: {
                x: 25,
                y: 25,
                z: 0
            },
        posChange: {x: 0, y: 0, z: 0}
    }

    const secondBean: Bean = {
        pos: {
                x: 40,
                y: 35,
                z: 0
            },
        lastPos: {
                x: 30,
                y: 35,
                z: 0
            },
        posChange: {x: 0, y: 0, z: 0}
    }
    
    drawOutlineForBeans([firstBean, secondBean]);

    intervalID = window.setInterval(() => {
        drawBeans(beans);

        beans = simulateBeans(beans);

    }, 1);
}

generateIsland();
