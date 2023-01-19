const logElement = document.getElementById('log');

export function log(message: any): void {
    const newLog = document.createElement('p');

    const text = document.createTextNode(message);
    newLog.appendChild(text);

    logElement?.appendChild(newLog);
}
