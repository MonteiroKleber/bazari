import { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, RotateCcw, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { type ReferralTreeNode, shortenAddress } from '@/hooks/blockchain/useAffiliate';

interface ReferralTreeVisualizationProps {
  tree: ReferralTreeNode | null;
  width?: number;
  height?: number;
  className?: string;
  onNodeClick?: (node: ReferralTreeNode) => void;
  highlightAddress?: string;
}

interface D3Node extends d3.HierarchyPointNode<ReferralTreeNode> {
  x0?: number;
  y0?: number;
}

const NODE_RADIUS = 24;
const LEVEL_HEIGHT = 100;

// Color scale for levels
const levelColors = [
  '#22c55e', // Level 0 (root) - Green
  '#3b82f6', // Level 1 - Blue
  '#8b5cf6', // Level 2 - Purple
  '#f59e0b', // Level 3 - Amber
  '#ef4444', // Level 4+ - Red
];

function getLevelColor(level: number): string {
  return levelColors[Math.min(level, levelColors.length - 1)];
}

export function ReferralTreeVisualization({
  tree,
  width = 800,
  height = 600,
  className = '',
  onNodeClick,
  highlightAddress,
}: ReferralTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  // Convert tree to D3 hierarchy
  const hierarchy = useMemo(() => {
    if (!tree) return null;
    return d3.hierarchy(tree, (d) => d.children);
  }, [tree]);

  // Create tree layout
  const treeLayout = useMemo(() => {
    if (!hierarchy) return null;

    const layout = d3.tree<ReferralTreeNode>().nodeSize([60, LEVEL_HEIGHT]);
    return layout(hierarchy);
  }, [hierarchy]);

  // Get bounds of the tree
  const bounds = useMemo(() => {
    if (!treeLayout) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    treeLayout.descendants().forEach((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    return { minX, maxX, minY, maxY };
  }, [treeLayout]);

  // Render tree with D3
  useEffect(() => {
    if (!svgRef.current || !treeLayout) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate center offset
    const offsetX = width / 2;
    const offsetY = 50;

    // Create main group with transform
    const g = svg
      .append('g')
      .attr('transform', `translate(${offsetX + transform.x}, ${offsetY + transform.y}) scale(${zoom})`);

    // Draw links
    const linkGenerator = d3
      .linkVertical<d3.HierarchyPointLink<ReferralTreeNode>, d3.HierarchyPointNode<ReferralTreeNode>>()
      .x((d) => d.x)
      .y((d) => d.y);

    g.selectAll('.link')
      .data(treeLayout.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.5);

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(treeLayout.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onNodeClick) {
          onNodeClick(d.data);
        }
      });

    // Node circles
    nodes
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => getLevelColor(d.data.level))
      .attr('stroke', (d) =>
        d.data.address === highlightAddress ? '#fbbf24' : '#fff'
      )
      .attr('stroke-width', (d) => (d.data.address === highlightAddress ? 4 : 2))
      .attr('opacity', 0.9);

    // Node icons (person silhouette)
    nodes
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .text((d) => (d.data.directReferrals > 0 ? d.data.directReferrals : ''));

    // Node labels (address)
    nodes
      .append('text')
      .attr('y', NODE_RADIUS + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .text((d) => shortenAddress(d.data.address, 4));

    // Level badges
    nodes
      .filter((d) => d.data.level > 0)
      .append('text')
      .attr('x', NODE_RADIUS - 4)
      .attr('y', -NODE_RADIUS + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text((d) => `L${d.data.level}`);

    // Add hover effects
    nodes
      .on('mouseenter', function () {
        d3.select(this).select('circle').attr('opacity', 1);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('opacity', 0.9);
      });

  }, [treeLayout, width, height, zoom, transform, highlightAddress, onNodeClick]);

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoom(1);
    setTransform({ x: 0, y: 0 });
  };

  // Handle drag
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    svg.on('mousedown', (event) => {
      isDragging = true;
      startX = event.clientX - transform.x;
      startY = event.clientY - transform.y;
    });

    svg.on('mousemove', (event) => {
      if (!isDragging) return;
      setTransform({
        x: event.clientX - startX,
        y: event.clientY - startY,
      });
    });

    svg.on('mouseup', () => {
      isDragging = false;
    });

    svg.on('mouseleave', () => {
      isDragging = false;
    });

    return () => {
      svg.on('mousedown', null);
      svg.on('mousemove', null);
      svg.on('mouseup', null);
      svg.on('mouseleave', null);
    };
  }, [transform]);

  if (!tree) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado de arvore de referral disponivel</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Arvore de Referrals
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2">
          {levelColors.map((color, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs"
              style={{ borderColor: color, color }}
            >
              Nivel {index}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border bg-muted/20"
          style={{ height }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            className="cursor-grab active:cursor-grabbing"
          />
        </div>
        {/* Stats bar */}
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Total na rede: <strong>{tree.totalReferrals}</strong>
          </span>
          <span>
            Referrals diretos: <strong>{tree.directReferrals}</strong>
          </span>
          <span>
            Niveis: <strong>{bounds.maxY / LEVEL_HEIGHT + 1}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Alternative simple list view
interface ReferralListViewProps {
  tree: ReferralTreeNode | null;
  onNodeClick?: (node: ReferralTreeNode) => void;
}

export function ReferralListView({ tree, onNodeClick }: ReferralListViewProps) {
  if (!tree) return null;

  const renderNode = (node: ReferralTreeNode, isExpanded: boolean = true): JSX.Element => {
    const [expanded, setExpanded] = useState(isExpanded);

    return (
      <div key={node.address} className="pl-4">
        <div
          className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded px-2 cursor-pointer"
          onClick={() => {
            if (node.children.length > 0) {
              setExpanded(!expanded);
            }
            onNodeClick?.(node);
          }}
        >
          {node.children.length > 0 ? (
            expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span className="w-4" />
          )}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getLevelColor(node.level) }}
          />
          <span className="font-mono text-sm">{shortenAddress(node.address, 6)}</span>
          <Badge variant="outline" className="text-xs">
            L{node.level}
          </Badge>
          {node.directReferrals > 0 && (
            <Badge variant="secondary" className="text-xs">
              {node.directReferrals} ref
            </Badge>
          )}
        </div>
        {expanded && node.children.length > 0 && (
          <div className="border-l ml-2">
            {node.children.map((child) => renderNode(child, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Lista de Referrals
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-auto">
        {renderNode(tree)}
      </CardContent>
    </Card>
  );
}
