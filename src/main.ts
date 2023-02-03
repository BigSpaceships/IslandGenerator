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

function lerp(t: number, start: unknown, end: unknown): unknown {
    if (typeof(start) === "number") {
        return start * t + end * (1 - t);
    } else {
        return {
            x: lerp(t, start.x, end.x),
            y: lerp(t, start.y, end.y),
            z: lerp(t, start.z, end.z)
        }
    }
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
        trimNext();
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
    // const startPositive = (start % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    // const endPositive = (end % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    // if (startPositive > endPositive) {
        // return start - end;
    // }

    // return 2 * Math.PI - (end - start);
    // console.log(2 * Math.PI)

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

function trimArc(arc1, arc2): {didSomething: boolean, arc1: ArcAngle, arc2: ArcAngle} {
    let didSomething = false;
    
    const distance = vectorMagnitude(subVectors(arc1.center, arc2.center));

    if (distance > 2 * arcRadius || distance == 0 ) {
        return {arc1, arc2}
    }

    const {posOne, posTwo} = getPoints(arc1.center, arc2.center);

    const relativeAngleOneArc1 = angleFromCenter(posOne, arc1.center);
    const relativeAngleTwoArc1 = angleFromCenter(posTwo, arc1.center);

    const relativeAngleOneArc2 = angleFromCenter(posOne, arc2.center);
    const relativeAngleTwoArc2 = angleFromCenter(posTwo, arc2.center);

    const arc1Index = getIndex(arc1.center);
    const arc2Index = getIndex(arc2.center);

    // console.log(isPointOnArc(arc1, posOne));
            
    if (isPointOnArc(arc1, posOne)) {
        didSomething = true;

        const isStart = isPointOnStartSide(posOne, arc1.center, arc2.center)
        
        // console.log(arc1Index, arc2Index, relativeAngleOneArc1, 1, isStart);
        if (isStart) {
            arc1.start = relativeAngleOneArc1;
        } else {
            arc1.end = relativeAngleOneArc1;
        }
    }

    if (isPointOnArc(arc1, posTwo)) {
        didSomething = true;

        const isStart = isPointOnStartSide(posTwo, arc1.center, arc2.center)
        
        // console.log(arc1Index, arc2Index, relativeAngleTwoArc1, 2, isStart);
        if (isStart) {
            arc1.start = relativeAngleTwoArc1;
        } else {
            arc1.end = relativeAngleTwoArc1;
        }
    }

    if (isPointOnArc(arc2, posOne)) {
        didSomething = true;

        const isStart = isPointOnStartSide(posOne, arc2.center, arc1.center)
        
        // console.log(arc2Index, arc1Index, relativeAngleOneArc2, 1, isStart);
        if (isStart) {
            arc2.start = relativeAngleOneArc2;
        } else {
            arc2.end = relativeAngleOneArc2;
        }
    }

    if (isPointOnArc(arc2, posTwo)) {
        didSomething = true;

        const isStart = isPointOnStartSide(posTwo, arc2.center, arc1.center)
        
        // console.log(arc2Index, arc1Index, relativeAngleTwoArc2, 2, isStart);
        if (isStart) {
            arc2.start = relativeAngleTwoArc2;
        } else {
            arc2.end = relativeAngleTwoArc2;
        }
    }

    return {
        didSomething, arc1, arc2
    }
}

function trimArcs(arcs: ArcAngle[], indicies: number[]): ArcAngle[] {
    for (let i = 0; i < indicies.length; i++) {
        for (let j = i; j < indicies.length; j++) {
            // const {arc1, arc2} = trimArc(arcs[i], arcs[j])
            // arcs[i] = arc1;
            // arcs[j] = arc2;
        }
    }

    return arcs;
}

function trimNext() {
    const {didSomething, arc1, arc2} = trimArc(globalArcs[currentI], globalArcs[currentJ]);
    globalArcs[currentI] = arc1;
    globalArcs[currentJ] = arc2;

    renderArcs(globalArcs);

    currentJ++;

    if (currentJ >= globalArcs.length) {
        currentJ = 0;
        currentI++;

        if (currentI >= globalArcs.length) {
            done = true;
            return;
        }        
    }

    if (didSomething) {
        return;
    }

    trimNext();
    
    return
}

function renderArcs(arcs: ArcAngle[]): void {
    
    while (pathParentElement?.lastChild) {
        pathParentElement.removeChild(pathParentElement.lastChild);
    }
    
    const arcsByPos: ArcWithPos[] = [] as ArcWithPos[];

    for (let i = 0; i < arcs.length; i++) {
        const arc = arcs[i];

        if (!arc.enabled) continue;

        const distance = radiansTraveled(arc.start, arc.end)
        
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

function drawGroup(group: Bean[]): void {    
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

            const theta1 = angleFromCenter(posOne, firstBean);
            const theta2 = angleFromCenter(posTwo, firstBean);

            const distance1 = radiansTraveled(theta1, theta2);

            // console.log(firstBean, theta1, theta2, distance1)
            
            const arc1Start = distance1 > Math.PI ? theta1 : theta2;
            const arc1End = distance1 > Math.PI ? theta2 : theta1;
            
            const arc1: ArcAngle = {
                center: firstBean,
                start: arc1Start,
                end: arc1End,
                enabled: true,
            }

            const theta3 = angleFromCenter(posOne, secondBean);
            const theta4 = angleFromCenter(posTwo, secondBean);

            const distance2 = radiansTraveled(theta3, theta4);

            // console.log(secondBean, theta3, theta4, distance2)

            const arc2Start = distance2 > Math.PI ? theta3 : theta4;
            const arc2End = distance2 > Math.PI ? theta4 : theta3;
            
            const arc2: ArcAngle = {
                center: secondBean,
                start: arc2Start,
                end: arc2End,
                enabled: true,
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

    console.log(arcs)

    for (let i = 0; i < 1; i++) {
        arcs = trimArcs(arcs, arcsForBean[i]);
    }

    // arcs.pop();

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

    drawBeans(largestGroup);
    drawGroup(largestGroup);
    
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

        // beans = simulateBeans(beans);

    }, 1);
}

generateIsland();
