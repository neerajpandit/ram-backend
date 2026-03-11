import path from 'path'

export const resolveSafePath = (baseDir, userInput) => {
  const basePath = path.resolve(baseDir);
  const resolvedPath = path.resolve(basePath, userInput);

  if (!resolvedPath.startsWith(basePath + path.sep)) {
    throw new Error("Path traversal detected");
  }

  return resolvedPath;
};