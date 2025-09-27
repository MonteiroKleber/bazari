import { useMemo } from 'react';

export interface CategoryFacet {
  path: string[];
  count: number;
}

interface StoreCategoryTreeProps {
  categories?: CategoryFacet[];
  activePath?: string[];
  onSelect: (path: string[]) => void;
}

type CategoryNode = {
  name: string;
  path: string[];
  count: number;
  children: CategoryNode[];
};

function buildTree(categories: CategoryFacet[] | undefined): CategoryNode[] {
  if (!categories || categories.length === 0) return [];

  const rootMap = new Map<string, { node: CategoryNode; children: Map<string, any> }>();

  for (const facet of categories) {
    const { path, count } = facet;
    if (!Array.isArray(path) || path.length === 0) continue;

    let currentLevel = rootMap;
    let currentPath: string[] = [];

    for (const segment of path.slice(0, 4)) {
      currentPath = [...currentPath, segment];
      const key = segment;

      if (!currentLevel.has(key)) {
        currentLevel.set(key, {
          node: {
            name: segment,
            path: currentPath,
            count,
            children: [],
          },
          children: new Map<string, { node: CategoryNode; children: Map<string, any> }>(),
        });
      } else {
        const wrapper = currentLevel.get(key)!;
        wrapper.node.count = Math.max(wrapper.node.count, count);
      }

      const wrapper = currentLevel.get(key)!;
      currentLevel = wrapper.children;
    }
  }

  const mapToArray = (
    map: Map<string, { node: CategoryNode; children: Map<string, any> }>
  ): CategoryNode[] =>
    Array.from(map.values())
      .map(({ node, children }) => ({
        ...node,
        children: mapToArray(children),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return mapToArray(rootMap);
}

function CategoryList({
  nodes,
  level,
  activePath,
  onSelect,
}: {
  nodes: CategoryNode[];
  level: number;
  activePath?: string[];
  onSelect: (path: string[]) => void;
}) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <ul className="space-y-1" style={{ paddingLeft: level === 0 ? 0 : level * 16 }}>
      {nodes.map((node) => {
        const children = node.children;
        const isActive = activePath && node.path.join('>') === activePath.join('>');
        const isAncestor =
          activePath && activePath.length > node.path.length && activePath.slice(0, node.path.length).join('>') === node.path.join('>');

        return (
          <li key={node.path.join('/')}
            className={`rounded-md ${isActive ? 'bg-store-brand/15 text-store-brand' : isAncestor ? 'bg-store-brand/5 text-store-ink' : 'text-store-ink/80'}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-store-brand/10"
              onClick={() => onSelect(node.path)}
            >
              <span className="line-clamp-1">
                {node.name}
              </span>
              <span className="text-xs text-store-ink/60">{node.count}</span>
            </button>
            {children.length > 0 && (
              <div className="pl-4">
                <CategoryList nodes={children} level={level + 1} activePath={activePath} onSelect={onSelect} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function StoreCategoryTree({ categories, activePath, onSelect }: StoreCategoryTreeProps) {
  const nodes = useMemo(() => buildTree(categories), [categories]);

  if (!nodes.length) {
    return (
      <div className="text-sm text-store-ink/60">
        Nenhuma categoria disponível.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CategoryList nodes={nodes} level={0} activePath={activePath} onSelect={onSelect} />
    </div>
  );
}

export default StoreCategoryTree;
