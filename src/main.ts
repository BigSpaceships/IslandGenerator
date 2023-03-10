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

function lerp(t: number, start: number, end: number): number;
function lerp(t: number, start: Vector, end: Vector): Vector;

function lerp(t: number, start: Vector | number, end: Vector | number): Vector | number {
    if (typeof(start) === "number" && typeof(end) === "number") {
        return start * t + end * (1 - t);
    } else if ((<Vector>start).x != undefined) {
        return {
            x: lerp(t, (<Vector>start).x, (<Vector>end).x),
            y: lerp(t, (<Vector>start).y, (<Vector>end).y),
            z: lerp(t, (<Vector>start).z, (<Vector>end).z)
        }
    } else {
        return 0;
    }
}

function approxEqual(val1: number, val2: number): boolean {
    return Math.abs(val1 - val2) < 0.0001;
}

let currentI = 0;
let currentJ = 0;

let done = false;

let globalArcs: ArcAngle[] = [] as ArcAngle[];

window.addEventListener("keydown", (e) => {
    if (e.key == "Enter") {
        if (done) {
            return; 
        }
        // trimNext();
    }
})

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
    enabled: boolean;
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
    return (start - end + 2 * Math.PI) % (2 * Math.PI); 
}

function angleFromCenter(point: Vector, center: Vector): number {
    const relativeVector = subVectors(point, center);
    
    return Math.atan2(relativeVector.y, relativeVector.x);
}

function isPointOnArc(arc: ArcAngle, point: Vector): boolean {
    const angle = angleFromCenter(point, arc.center);
    // console.log(angle)
    if (arc.start > arc.end) {
        return arc.start > angle && angle > arc.end;
    }

    return angle > arc.end || angle < arc.start;
}

function isPointOnStartSide(point: Vector, start: Vector, end: Vector): boolean {
    if (start.x == end.x) {
        if (start.y > end.y) {
            return point.x < start.x;
        } else {
            return point.x > start.x;
        }
    }

    const t = (point.x - end.x) / (start.x - end.x);
    const height = lerp(t, start.y, end.y);

    if (start.x > end.x) {
        return point.y > height;
    } else {
        return height > point.y;
    }
}

function getIndex(center: Vector): number {
    return centers.indexOf(center);
}

function getPointFromNumber(center: Vector, angle: number): Vector {
    return {
        x: Math.cos(angle) * arcRadius + center.x,
        y: Math.sin(angle) * arcRadius + center.y,
        z: 0,
    }
}

function renderArcs(arcs: ArcAngle[]): void {
    
    while (pathParentElement?.lastChild) {
        pathParentElement.removeChild(pathParentElement.lastChild);
    }
    
    const arcsByPos: ArcWithPos[] = [] as ArcWithPos[];

    for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];

        if (!arc.enabled) continue;

        const distance = radiansTraveled(arc.start, arc.end);
        
        const posOne = getPointFromNumber(arc.center, arc.start);

        const posTwo = getPointFromNumber(arc.center, arc.end);

        const isLarge = distance > Math.PI;

        arcsByPos.push({
            pos1: posOne,
            pos2: posTwo,
            direction: 0,
            large: isLarge ? 1 : 0,
        })

        // console.log(arc, arcsByPos[arcsByPos.length - 1].pos1);
    }

    // pathString.push(`M ${arcsByPos[0].pos1.x} ${arcsByPos[0].pos1.y}`)

    for (let i = 0; i < arcsByPos.length; i++) {
        const arc = arcsByPos[i];
        
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let pathString: string[] = [] as string[];
        

        pathString.push(`M ${arc.pos1.x} ${arc.pos1.y}`)
        pathString.push(`A 10 10 0 ${arc.large} ${arc.direction} ${arc.pos2.x} ${arc.pos2.y}`);
        

        pathEl.setAttribute("d", pathString.join(' '))

        pathParentElement?.appendChild(pathEl);
    }

    // pathString.push(`L ${points[0].x} ${points[0].y}`);
}

function trimArcs(arcOne: ArcAngle, arcTwo: ArcAngle): {arcOne: ArcAngle, arcTwo: ArcAngle} {

    const vectorBetweenCenters = subVectors(arcTwo.center, arcOne.center);
    const halfVectorBetweenCenters: Vector = {
        x: vectorBetweenCenters.x / 2,
        y: vectorBetweenCenters.y / 2,
        z: vectorBetweenCenters.z / 2,
    }

    const center = addVectors(arcOne.center, halfVectorBetweenCenters);

    const isOnFirstArc = isPointOnArc(arcOne, center);
    const isOnSecondArc = isPointOnArc(arcTwo, center);

    if (isOnFirstArc) {
        arcOne.enabled = false;
    }

    if (isOnSecondArc) {
        arcTwo.enabled = false;
    }

    return {
        arcOne,
        arcTwo,
    };
}

function drawGroup(group: Bean[]): void {
    let breakingPoints: number[][] = [[]];
    for (let i = 0; i < group.length; i++) {
        breakingPoints.push([]);
        
        for (let j = 0; j < group.length; j++) {
            const {posOne, posTwo} = getPoints(group[i], group[j]);

            const thetaOne = angleFromCenter(posOne, group[i].pos);
            const thetaTwo = angleFromCenter(posTwo, group[i].pos);

            if (Number.isNaN(thetaOne)) continue;

            breakingPoints[i].push(thetaOne);
            breakingPoints[i].push(thetaTwo);
        }
    }

    // console.log(breakingPoints);

    let arcs: ArcAngle[] = [] as ArcAngle[];

    for (let i = 0; i < group.length; i++) {
        let newArcs: ArcAngle[] = [] as ArcAngle[];

        breakingPoints[i] = breakingPoints[i].sort((a, b) => {
            return (b + 2 * Math.PI) % (2 * Math.PI) - (a + 2 * Math.PI) % (2 * Math.PI)
        });

        for (let j = 0; j < breakingPoints[i].length; j++) {
            const indexOne = j;
            const indexTwo = j == breakingPoints[i].length - 1 ? 0 : j + 1;

            newArcs.push({
                center: group[i].pos,
                start: breakingPoints[i][indexOne],
                end: breakingPoints[i][indexTwo],
                enabled: true
            })
        }
        arcs = arcs.concat(newArcs);
    }

    // 1) make a list of what arcs are at each point: done
    // 2) at each point, there are a few start arcs and end arcs and there can only be one 
    // 3) eliminate the ones that are closer together (the ones remaining should have the greatest angle between the arc centers and the point. probably just maximize the distance between the two arc centers)

    const pointIndicies: Vector[] = [];
    const pointToArcs: number[][] = [];

    for (let i = 0; i < arcs.length; i++) {
        const element = arcs[i];
        const startPos = getPointFromNumber(element.center, element.start);
        const endPos = getPointFromNumber(element.center, element.end);

        let startIndex = pointIndicies.findIndex((val) => {
            return approxEqual(val.x, startPos.x) && approxEqual(val.y, startPos.y);
        });

        if (startIndex == -1) {
            startIndex = pointIndicies.length;
            pointIndicies.push(startPos);
            pointToArcs.push([])
        }

        pointToArcs[startIndex].push(i);

        let endIndex = pointIndicies.findIndex((val) => {
            return approxEqual(val.x, endPos.x) && approxEqual(val.y, endPos.y);
        });

        if (endIndex == -1) {
            endIndex = pointIndicies.length;
            pointIndicies.push(endPos);
            pointToArcs.push([]);
        }

        pointToArcs[endIndex].push(i);
    }

    console.log(pointIndicies)
    console.log(pointToArcs);

    renderArcs(arcs)    

    globalArcs = arcs;
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

    // console.log(largestGroup)

    // drawBeans(largestGroup);
    // drawGroup(largestGroup);
    
    // groups.forEach((group: Bean[]) => {
    //     drawGroup(group);
    // })
}

const centers = [
    {x: 25, y: 25, z: 0},
    {x: 40, y: 35, z: 0},
    {x: 40, y: 20, z: 0},
    {x: 50, y: 30, z: 0}
]

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

    const zero = {x: 0, y: 0, z: 0};

    const firstBean: Bean = {
        pos: centers[0],
        lastPos: zero,
        posChange: zero,
    }

    const secondBean: Bean = {
        pos: centers[1],
        lastPos: zero,
        posChange: zero
    }

    const thirdBean: Bean = {
        pos: centers[2],
        lastPos: zero,
        posChange: zero
    }
    const fourthBean: Bean = {
        pos: centers[3],
        lastPos: zero,
        posChange: zero,
    }
    
    drawBeans([firstBean, secondBean, thirdBean, fourthBean]);
    drawGroup([firstBean, secondBean, thirdBean, fourthBean]);

    intervalID = window.setInterval(() => {
        // drawBeans(beans);

        beans = simulateBeans(beans);

    }, 1);
}

generateIsland();
