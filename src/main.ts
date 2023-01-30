import './style.css';
// import { log } from './logger';

const svgElement = document.getElementsByTagName('svg')[0];
const circleParentElement = document.getElementById("circle-group");
const pathParentElement = document.getElementById("path-group");

const radius = 5;
const drag = 0.7;
const gravity = .5;
const tossSpeed = 75;
const arcRadius = 10;

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

type ArcWithPos = {
    pos1: Vector;
    pos2: Vector;
    direction: number;
    large: number;
}

type ArcAngle = {
    center: Vector;
    start: number;
    end: number;
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

function getPoints(beanOne: Bean | Vector, beanTwo: Bean | Vector): {posOne: Vector, posTwo: Vector}  {
    const firstBeanPos: Vector = (<Bean>beanOne).pos ? (<Bean>beanOne).pos : beanOne as Vector; 
    const secondBeanPos: Vector = (<Bean>beanTwo).pos ? (<Bean>beanTwo).pos : beanTwo as Vector;

    const vectorBetween = subVectors(firstBeanPos, secondBeanPos);

    const distanceSquared = ((firstBeanPos.x - secondBeanPos.x) * (firstBeanPos.x - secondBeanPos.x) + (firstBeanPos.y - secondBeanPos.y) * (firstBeanPos.y - secondBeanPos.y)) / 4;
    const distanceToPoints = Math.sqrt(arcRadius * arcRadius - distanceSquared);

    const slope = -vectorBetween.x / vectorBetween.y;

    const xChange = Math.sqrt(distanceToPoints * distanceToPoints / (1 + slope * slope));

    const firstIntersectionPos = {
        x: (firstBeanPos.x + secondBeanPos.x) / 2 + xChange,
        y: (firstBeanPos.y + secondBeanPos.y) / 2 + slope * xChange,
        z: 0,
    }

    const secondIntersectionPos = {
        x: (firstBeanPos.x + secondBeanPos.x) / 2 - xChange,
        y: (firstBeanPos.y + secondBeanPos.y) / 2 - slope * xChange,
        z: 0,
    }

    return {
        posOne: firstIntersectionPos,
        posTwo: secondIntersectionPos,
    }
}

function drawOutlineForBeans(beans: Bean[]): void {
    drawBeans(beans);

    const {posOne, posTwo} = getPoints(beans[0], beans[1]);

    let pathInstructions: string[] = [] as string[];

    pathInstructions.push(`M ${posOne.x} ${posOne.y}`);
    pathInstructions.push(`A ${arcRadius} ${arcRadius} 0 1 0 ${posTwo.x} ${posTwo.y}`);
    pathInstructions.push(`A ${arcRadius} ${arcRadius} 0 1 0 ${posOne.x} ${posOne.y}`);

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

function radiansTraveled(start: number, end: number): number {
    const startPositive = (start % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const endPositive = (end % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    if (startPositive > endPositive) {
        return start - end;
    }

    return 2 * Math.PI - (end - start);
}

function trimArcs(arcs: ArcAngle[], indicies: number[]): ArcAngle[] {
    for (let i = 0; i < indicies.length; i++) {
        for (let j = i; j < indicies.length; j++) {
            const arc1 = arcs[i];
            const arc2 = arcs[j];
            
            const distance = vectorMagnitude(subVectors(arc1.center, arc2.center));

            if (distance > 2 * arcRadius || distance == 0 ) {
                continue;
            }

            // const {posOne, posTwo} = getPoints(arc1.center, arc2.center);
        }
    }

    return arcs;
}

function drawGroup(group: Bean[]): void {
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    let arcs = [] as ArcAngle[];
    // const usedBeans = shortestPath(group);
    const closeEnoughBeans: number[][] = [[]] as number[][];

    for (let i = 0; i < group.length; i++) {
        closeEnoughBeans.push([])
        for (let j = i; j < group.length; j++) {
            if (i == j) continue;

            if (vectorMagnitude(subVectors(group[i].pos, group[j].pos)) < 2 * arcRadius) {
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

            const index1 = arcs.length;
            const index2 = arcs.length + 1;
            
            const {posOne, posTwo} = getPoints(group[i], group[closeEnoughBeans[i][j]])

            const relativePosOne = subVectors(posOne, firstBean);
            const relativePosTwo = subVectors(posTwo, firstBean);
            const theta1 = Math.atan2(relativePosOne.y, relativePosOne.x);
            const theta2 = Math.atan2(relativePosTwo.y, relativePosTwo.x);

            const distance1 = radiansTraveled(theta1, theta2);
            
            const arc1Start = distance1 > Math.PI ? theta1 : theta2;
            const arc1End = distance1 > Math.PI ? theta2 : theta1;
            
            const arc1: ArcAngle = {
                center: firstBean,
                start: arc1Start,
                end: arc1End,
            }

            const relativePosThree = subVectors(posOne, secondBean);
            const relativePosFour = subVectors(posTwo, secondBean);
            const theta3 = Math.atan2(relativePosThree.y, relativePosThree.x);
            const theta4 = Math.atan2(relativePosFour.y, relativePosFour.x);

            const distance2 = radiansTraveled(theta3, theta4);

            const arc2Start = distance2 > Math.PI ? theta3 : theta4;
            const arc2End = distance2 > Math.PI ? theta4 : theta3;
            
            const arc2: ArcAngle = {
                center: secondBean,
                start: arc2Start,
                end: arc2End,
            }
            
            // const arc1: ArcWithPos = {
            //     pos1: firstIntersectionPos,
            //     pos2: secondIntersectionPos,
            //     direction: 0,
            //     large: 1,
            // }

            // const arc2: ArcWithPos = {
            //     pos1: secondIntersectionPos,
            //     pos2: firstIntersectionPos,
            //     direction: 0,
            //     large: 1,
            // }


            arcs.push(arc1, arc2)

            arcsForBean[i].push(index1, index2);
            arcsForBean[closeEnoughBeans[i][j]].push(index1, index2);
        }
    }

    // console.log(arcs)
    
    let pathString: string[] = [] as string[];

    for (let i = 0; i < group.length; i++) {
        arcs = trimArcs(arcs, arcsForBean[i]);
    }

    // arcs.pop();

    const arcsByPos: ArcWithPos[] = [] as ArcWithPos[];

    for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];

        console.log(arc, radiansTraveled(arc.start, arc.end));

        
        const posOne: Vector = {
            x: Math.cos(arc.start) * arcRadius + arc.center.x,
            y: Math.sin(arc.start) * arcRadius + arc.center.y,
            z: 0,
        }

        const posTwo: Vector = {
            x: Math.cos(arc.end) * arcRadius + arc.center.x,
            y: Math.sin(arc.end) * arcRadius + arc.center.y,
            z: 0,
        }

        arcsByPos.push({
            pos1: posOne,
            pos2: posTwo,
            direction: 0,
            large: 1,
        })
    }

    // pathString.push(`M ${arcsByPos[0].pos1.x} ${arcsByPos[0].pos1.y}`)

    for (let i = 0; i < arcsByPos.length; i++) {
        const arc = arcsByPos[i];

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

                if (distance < 2 * arcRadius) {
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

    // drawBeans(beans);

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
    
    drawBeans([firstBean, secondBean]);
    drawGroup([firstBean, secondBean]);

    intervalID = window.setInterval(() => {
        // drawBeans(beans);

        beans = simulateBeans(beans);

    }, 1);
}

generateIsland();
