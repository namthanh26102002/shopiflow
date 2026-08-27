import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Layers, Zap, Target, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Layers,
    title: 'Drag & Drop Builder',
    description: 'Create questions with an intuitive drag-and-drop interface. No coding required.',
  },
  {
    icon: Target,
    title: 'Smart Recommendations',
    description: 'Map answers to products and let the quiz recommend the perfect match.',
  },
  {
    icon: Zap,
    title: 'Instant Preview',
    description: 'See exactly how your quiz looks to customers in real-time.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track quiz starts, completions, and top recommended products.',
  },
];

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">QuizFlow</span>
          </div>
          <Link to="/builder">
            <Button className="bg-primary hover:bg-primary/90">
              Open Builder
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light text-primary text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Build product quizzes in minutes
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 tracking-tight text-balance">
          Turn browsers into
          <br />
          <span className="text-primary">buyers</span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance">
          Create beautiful product recommendation quizzes that guide customers to their perfect match. No coding. No complexity.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link to="/builder">
            <Button size="lg" className="bg-primary hover:bg-primary/90 h-12 px-8 text-base">
              Start Building
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need</h2>
          <p className="text-lg text-muted-foreground">Simple tools to create powerful product quizzes</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="card-interactive p-6">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="card-elevated p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to boost conversions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your first quiz in under 5 minutes. No credit card required.
          </p>
          <Link to="/builder">
            <Button size="lg" className="bg-primary hover:bg-primary/90 h-12 px-8 text-base">
              Create Your Quiz
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">QuizFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">Built with ❤️ for e-commerce brands</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
