import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useWinningProducts, WinningProduct } from '@/hooks/useWinningProducts';
import { ProductForm } from '@/components/winning-products/ProductForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

const WinningProductsManage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { products, isLoading, createProduct, updateProduct, deleteProduct, uploadImage } = useWinningProducts();
  const [editing, setEditing] = useState<WinningProduct | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-32" /></div>;
  if (!isAdmin) {
    navigate('/winning-products');
    return null;
  }

  const handleCreate = (data: any) => {
    createProduct.mutate(data, { onSuccess: () => setShowForm(false) });
  };

  const handleUpdate = (data: any) => {
    if (!editing) return;
    updateProduct.mutate({ id: editing.id, ...data }, { onSuccess: () => { setEditing(null); setShowForm(false); } });
  };

  const openEdit = (product: WinningProduct) => {
    setEditing(product);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate('/winning-products')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        <h1 className="text-xl font-bold text-foreground">Manage Products</h1>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No products yet. Add your first one!</p>
        ) : (
          <div className="space-y-3">
            {products.map(product => (
              <Card key={product.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-secondary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.niche || 'No niche'}</p>
                  </div>
                  <Badge variant={product.published ? 'default' : 'secondary'} className="gap-1 shrink-0">
                    {product.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {product.published ? 'Live' : 'Draft'}
                  </Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(product)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete product?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteProduct.mutate(product.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editing ?? undefined}
              onSubmit={editing ? handleUpdate : handleCreate}
              onUploadImage={uploadImage}
              isSubmitting={createProduct.isPending || updateProduct.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default WinningProductsManage;
