import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
/**
 * Kit Browser Page
 * Browse and install available kits
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Download, ExternalLink, Package, Search } from 'lucide-react';

const KitBrowserPage: React.FC = () => {
  // Mock kits data
  const kits = [
    {
      id: 'testing-vitest',
      name: 'Testing with Vitest',
      description: 'Complete testing suite with Vitest orchestration',
      version: '1.0.0',
      agents: 5,
      installed: true,
    },
    {
      id: 'frontend-react',
      name: 'Frontend React Kit',
      description: 'React component development and testing',
      version: '0.9.0',
      agents: 4,
      installed: false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Kits</CardTitle>
          <CardDescription>Discover and install reusable agent kits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search kits..." className="pl-10" />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Kits Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {kits.map((kit) => (
          <Card key={kit.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{kit.name}</CardTitle>
                    <CardDescription className="text-xs">
                      v{kit.version} • {kit.agents} agents
                    </CardDescription>
                  </div>
                </div>
                {kit.installed && (
                  <Badge variant="secondary" className="text-xs">
                    Installed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{kit.description}</p>
              <div className="flex gap-2">
                {kit.installed ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    <Button size="sm" variant="destructive">
                      Uninstall
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="vscode" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Install Kit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (if no kits) */}
      {kits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No kits found</h3>
            <p className="text-sm text-muted-foreground text-center">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KitBrowserPage;
