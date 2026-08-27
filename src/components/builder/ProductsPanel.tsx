import React from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useQuiz } from '@/contexts/QuizContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateId } from '@/types/quiz';

export const ProductsPanel: React.FC = () => {
  const { quiz, addProduct, updateProduct, deleteProduct } = useQuiz();

  const handleAddProduct = () => {
    addProduct({
      id: generateId(),
      name: 'New Product',
      description: 'Product description',
      imageUrl: '',
      price: '$0',
      url: '#',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Products</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Products to recommend based on quiz answers</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddProduct}
          className="text-primary hover:text-primary hover:bg-primary-light h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {quiz.products.map((product) => (
          <div key={product.id} className="card-elevated p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                    placeholder="Product name"
                    className="mt-1 input-clean"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    value={product.description}
                    onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                    placeholder="Short description"
                    className="mt-1 input-clean"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <Input
                      value={product.price}
                      onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                      placeholder="$29"
                      className="mt-1 input-clean"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Image URL</Label>
                    <Input
                      value={product.imageUrl}
                      onChange={(e) => updateProduct(product.id, { imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="mt-1 input-clean"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Product URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={product.url}
                      onChange={(e) => updateProduct(product.id, { url: e.target.value })}
                      placeholder="https://yourstore.com/product"
                      className="flex-1 input-clean"
                    />
                    {product.url && product.url !== '#' && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-muted-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {quiz.products.length > 1 && (
              <div className="pt-2 border-t border-border-subtle">
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove product
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
