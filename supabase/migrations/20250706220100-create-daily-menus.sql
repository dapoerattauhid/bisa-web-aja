
-- Create daily_menus table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  food_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL CHECK (price > 0),
  is_available BOOLEAN DEFAULT true,
  max_quantity INTEGER CHECK (max_quantity > 0),
  current_quantity INTEGER DEFAULT 0 CHECK (current_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, food_item_id)
);

-- Enable RLS
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view daily menus" 
  ON public.daily_menus 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage daily menus" 
  ON public.daily_menus 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_menus_date ON public.daily_menus(date);
CREATE INDEX IF NOT EXISTS idx_daily_menus_food_item_id ON public.daily_menus(food_item_id);
CREATE INDEX IF NOT EXISTS idx_daily_menus_is_available ON public.daily_menus(is_available);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_menus_updated_at 
    BEFORE UPDATE ON public.daily_menus 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
