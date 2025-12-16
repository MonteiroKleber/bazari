/**
 * NewProjectWizard - Step-by-step project creation wizard with template gallery
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { localServer } from '../../services/localServer.client';
import { templatesService } from '../../services/templates.service';
import { TemplateGallery } from '../templates';
import type { Template } from '../../types/studio.types';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Store,
  ExternalLink,
} from 'lucide-react';
import {
  DistributionConfig,
  type DistributionConfigValue,
} from '../distribution';

interface NewProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectPath: string) => void;
}

interface Category {
  id: string;
  name: string;
}

type Step = 'template' | 'details' | 'distribution' | 'creating' | 'success';

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  open,
  onOpenChange,
  onProjectCreated,
}) => {
  const [step, setStep] = useState<Step>('template');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tools');
  const [author, setAuthor] = useState('Developer');

  // Distribution config
  const [distribution, setDistribution] = useState<DistributionConfigValue>({
    appStore: true,
    external: false,
    allowedOrigins: [],
  });

  // Created project info
  const [createdPath, setCreatedPath] = useState<string>('');
  const [createdSlug, setCreatedSlug] = useState<string>('');

  // Load categories on mount
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Auto-fill category from template
  useEffect(() => {
    if (selectedTemplate) {
      setCategory(selectedTemplate.category);
    }
  }, [selectedTemplate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const categoriesData = await localServer.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    // Toggle selection
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
    } else {
      setSelectedTemplate(template);
    }
  };

  const handleNext = () => {
    if (step === 'template' && selectedTemplate) {
      setStep('details');
    } else if (step === 'details') {
      setStep('distribution');
    } else if (step === 'distribution') {
      handleCreate();
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('template');
    } else if (step === 'distribution') {
      setStep('details');
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;

    setStep('creating');
    setCreating(true);
    setError(null);

    try {
      // Process template files with placeholders
      const slug = templatesService.generateSlug(projectName);
      const processedFiles = templatesService.processFiles(selectedTemplate, {
        name: projectName,
        slug,
        description,
        author,
        category,
      });

      // Create project via CLI server
      const result = await localServer.createProject({
        name: projectName,
        description,
        template: selectedTemplate.id,
        category,
        author,
        files: processedFiles,
        distribution,
      });

      if (result.success && result.projectPath) {
        setCreatedPath(result.projectPath);
        setCreatedSlug(result.slug || slug);
        setStep('success');
      } else {
        setError(result.error || 'Failed to create project');
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setStep('details');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenProject = () => {
    onProjectCreated(createdPath);
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setStep('template');
    setSelectedTemplate(null);
    setProjectName('');
    setDescription('');
    setCategory('tools');
    setAuthor('Developer');
    setDistribution({ appStore: true, external: false, allowedOrigins: [] });
    setError(null);
    setCreatedPath('');
    setCreatedSlug('');
    onOpenChange(false);
  };

  const isDetailsValid = projectName.trim().length > 0 && description.trim().length > 0;
  const isDistributionValid = distribution.appStore || distribution.external;

  const renderTemplateStep = () => (
    <div className="h-[400px]">
      <TemplateGallery
        onSelect={handleTemplateSelect}
        selectedTemplate={selectedTemplate}
      />
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-4">
      {/* Selected template info */}
      {selectedTemplate && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: selectedTemplate.color + '20' }}
            >
              <span style={{ color: selectedTemplate.color }} className="text-lg font-bold">
                {selectedTemplate.name.charAt(0)}
              </span>
            </div>
            <div>
              <h4 className="font-medium">{selectedTemplate.name}</h4>
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.files.length} files • {selectedTemplate.sdkFeatures.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          placeholder="My Bazari App"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        {projectName && (
          <p className="text-xs text-muted-foreground">
            Slug: {templatesService.generateSlug(projectName)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="A brief description of your app..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            placeholder="Developer"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
      </div>

      {/* Permissions preview */}
      {selectedTemplate && selectedTemplate.defaultPermissions.length > 0 && (
        <div className="space-y-2">
          <Label>Requested Permissions</Label>
          <div className="rounded-lg bg-muted/50 p-3">
            <ul className="space-y-1 text-sm">
              {selectedTemplate.defaultPermissions.map((perm) => (
                <li key={perm.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    <code className="text-xs">{perm.id}</code>
                    {perm.optional && (
                      <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                    )}
                    <span className="block text-xs text-muted-foreground">{perm.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );

  const renderDistributionStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="font-medium">Como você quer distribuir seu app?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Você pode escolher uma ou ambas as opções
        </p>
      </div>

      <DistributionConfig value={distribution} onChange={setDistribution} />

      {/* Summary */}
      <div className="rounded-lg bg-muted/50 p-4 mt-4">
        <h4 className="text-sm font-medium mb-2">Resumo</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="capitalize">{category}</span>
            <span>•</span>
            <span>{selectedTemplate?.name}</span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {distribution.appStore && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <Store className="h-3 w-3" />
                App Store
              </span>
            )}
            {distribution.external && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs text-orange-600">
                <ExternalLink className="h-3 w-3" />
                SDK Externo
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );

  const renderCreatingStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <h3 className="mt-4 text-lg font-medium">Creating Project...</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Setting up your {selectedTemplate?.name} project
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Processing {selectedTemplate?.files.length} files</span>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <Sparkles className="h-8 w-8 text-green-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium">Project Created!</h3>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Your project <strong>{createdSlug}</strong> is ready.
      </p>
      <code className="mt-2 rounded bg-muted px-2 py-1 text-xs">
        {createdPath}
      </code>
      {selectedTemplate && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Template:</span>
          <span className="font-medium text-foreground">{selectedTemplate.name}</span>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === 'template' ? 'sm:max-w-[800px]' : 'sm:max-w-[550px]'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            {step === 'template' && 'Choose a template to get started'}
            {step === 'details' && 'Enter your project details'}
            {step === 'distribution' && 'Configure distribution options'}
            {step === 'creating' && 'Setting up your project...'}
            {step === 'success' && 'Your project is ready!'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {step === 'template' && renderTemplateStep()}
              {step === 'details' && renderDetailsStep()}
              {step === 'distribution' && renderDistributionStep()}
              {step === 'creating' && renderCreatingStep()}
              {step === 'success' && renderSuccessStep()}
            </>
          )}
        </div>

        <DialogFooter>
          {step === 'template' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={!selectedTemplate}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'details' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!isDetailsValid}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'distribution' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleNext} disabled={!isDistributionValid || creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </>
          )}

          {step === 'success' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleOpenProject}>
                Open Project
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectWizard;
