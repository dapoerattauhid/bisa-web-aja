
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

export const populateDailyMenus = async () => {
  try {
    // Get all available menu items
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true);

    if (menuError) throw menuError;

    if (!menuItems || menuItems.length === 0) {
      console.log('No menu items found');
      return;
    }

    console.log('Found menu items:', menuItems);
    
    // Create daily menu entries for the next 7 days
    // Note: We'll use the menu_items directly since daily_menus table structure
    // is used for scheduling specific items for specific dates
    
    const dailyMenuPromises = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // For each menu item, create a daily menu entry
      for (const item of menuItems) {
        dailyMenuPromises.push(
          supabase
            .from('daily_menus')
            .upsert({
              date: dateStr,
              food_item_id: item.id, // This references menu_items.id
              price: item.price,
              is_available: true,
              max_quantity: 100, // Default max quantity
              current_quantity: 0
            }, {
              onConflict: 'date,food_item_id'
            })
        );
      }
    }

    const results = await Promise.all(dailyMenuPromises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Some daily menus failed to populate:', errors);
    } else {
      console.log('Daily menus populated successfully');
    }

  } catch (error) {
    console.error('Error in populateDailyMenus:', error);
    throw error;
  }
};
