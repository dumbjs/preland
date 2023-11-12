export function readSourceFile(file: any): any;
export function findIslands(sourceCode: any): {
    id: any;
    node: any;
    nodeItem: any;
}[];
export function islandNodeToTemplate(island: any): {
    server: any;
    client: string;
};
export function getExportedNodes(astBody: any): any;
export function generateServerTemplate(name: any): string;
export function generateClientTemplate(name: any): string;
export function isFunctionIsland(functionAST: any): boolean;
export function getIslandName(name: any): string;
