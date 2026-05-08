/**
 * Interaction Types & Schemas
 *
 * Defines all customer interaction types and their data structures.
 * These are the raw inputs that feed into the Profile Brain.
 */

// ============================================================================
// BASE INTERACTION
// ============================================================================

/**
 * Base properties shared by all interactions
 */
export interface BaseInteraction {
  interaction_id: string;
  customer_id: string;
  interaction_type: InteractionType;
  timestamp: string;
  session_id?: string; // Groups related interactions
  source: InteractionSource;
  metadata?: Record<string, any>;
}

export type InteractionType =
  | 'style_swipe'
  | 'style_quiz'
  | 'purchase'
  | 'wishlist_add'
  | 'request_a_look'
  | 'ai_chat'
  | 'product_hide'
  | 'product_view'
  | 'product_click'
  | 'search'
  | 'outfit_save'
  | 'outfit_edit';

export type InteractionSource =
  | 'web_app'
  | 'mobile_app'
  | 'in_store'
  | 'email_link'
  | 'sms_link'
  | 'stylist_session';

// ============================================================================
// 1. STYLE SWIPES
// ============================================================================

export interface StyleSwipeInteraction extends BaseInteraction {
  interaction_type: 'style_swipe';
  data: {
    stack_id: string;
    stack_type: 'broadcast' | 'diagnostic' | 'deepening' | 'editorial';
    stack_recipe: string;
    cards: SwipeCardInteraction[];
    completion_type: 'full' | 'abandoned';
    completion_percentage: number;
  };
}

export interface SwipeCardInteraction {
  card_id: string;
  card_type: 'lifestyle' | 'item' | 'outfit';
  position: number; // Card position in stack
  verdict: 'yes' | 'no' | 'skip';
  dwell_ms: number;
  saved: boolean;
  mini_pdp_opened: boolean;
  shared: boolean;

  // Content attributes (from card tags)
  content_tags: {
    pillars?: string[];
    vibes?: string[];
    occasions?: string[];
    colors?: string[];
    gender?: string;
    formality?: number;
    price_tier?: string;
  };

  // If it's an item/outfit card
  product_ids?: string[];
  outfit_id?: string;
}

// ============================================================================
// 2. STYLE QUIZ
// ============================================================================

export interface StyleQuizInteraction extends BaseInteraction {
  interaction_type: 'style_quiz';
  data: {
    quiz_id: string;
    quiz_version: string;
    quiz_type: 'onboarding' | 'deepening' | 'seasonal';
    questions: QuizQuestionResponse[];
    completion_percentage: number;
    time_to_complete_ms: number;
  };
}

export interface QuizQuestionResponse {
  question_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'image_select' | 'slider' | 'text_input';
  response: any; // Depends on question_type

  // Multiple choice
  selected_options?: string[];

  // Image select (similar to swipes but in quiz context)
  selected_images?: Array<{
    image_id: string;
    image_url: string;
    tags: Record<string, any>;
  }>;

  // Slider (e.g., formality preference)
  slider_value?: number; // 0-100

  // Text input (e.g., "describe your style")
  text_response?: string;

  // Metadata
  time_to_answer_ms: number;
  changed_answer: boolean;
}

// ============================================================================
// 3. PURCHASE
// ============================================================================

export interface PurchaseInteraction extends BaseInteraction {
  interaction_type: 'purchase';
  data: {
    order_id: string;
    order_date: string;
    channel: 'online' | 'in_store' | 'mobile';
    items: PurchaseItem[];
    total_amount: number;
    discount_amount?: number;
    currency: string;
  };
}

export interface PurchaseItem {
  product_id: string;
  product_name: string;
  brand: string;
  category: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;

  // Style attributes (from product catalog)
  style_attributes?: {
    pillars?: string[];
    colors?: string[];
    materials?: string[];
    formality?: number;
    season?: string[];
  };

  // Return/exchange tracking
  returned?: boolean;
  return_reason?: string;
  exchanged_for?: string;
}

// ============================================================================
// 4. WISHLIST / SAVE
// ============================================================================

export interface WishlistAddInteraction extends BaseInteraction {
  interaction_type: 'wishlist_add';
  data: {
    item_type: 'product' | 'outfit' | 'lifestyle_image';
    item_id: string;
    item_name?: string;
    item_price?: number;

    // Context - where was this saved from?
    saved_from: 'swipe' | 'browse' | 'pdp' | 'outfit_builder' | 'email' | 'recommendation';
    saved_from_id?: string; // Stack ID, outfit ID, etc.

    // Style attributes
    style_attributes?: {
      pillars?: string[];
      colors?: string[];
      occasions?: string[];
    };

    // Later actions
    purchased?: boolean;
    purchased_date?: string;
    removed?: boolean;
    removed_date?: string;
  };
}

// ============================================================================
// 5. REQUEST A LOOK (RAL)
// ============================================================================

export interface RequestALookInteraction extends BaseInteraction {
  interaction_type: 'request_a_look';
  data: {
    request_id: string;

    // Structured inputs
    occasion?: string;
    event_date?: string;
    budget_range?: {
      min: number;
      max: number;
    };
    categories?: string[]; // ["tops", "dresses", "shoes"]

    // Unstructured input (the rich stuff!)
    description: string; // Free-form text
    inspiration_images?: Array<{
      image_url: string;
      image_source: string;
    }>;

    // Stylist response (if fulfilled)
    fulfilled: boolean;
    fulfilled_date?: string;
    stylist_id?: string;
    recommended_outfits?: string[];
    recommended_products?: string[];
    stylist_notes?: string;

    // Customer feedback on recommendations
    feedback?: {
      liked_items: string[];
      disliked_items: string[];
      purchased_items: string[];
      rating?: number; // 1-5
      text_feedback?: string;
    };
  };
}

// ============================================================================
// 6. AI CHAT
// ============================================================================

export interface AIChatInteraction extends BaseInteraction {
  interaction_type: 'ai_chat';
  data: {
    conversation_id: string;
    messages: ChatMessage[];
    total_turns: number;
    duration_ms: number;

    // Extracted signals (processed by semantic layer)
    extracted_signals?: {
      stated_preferences: string[]; // ["loves florals", "dislikes skinny jeans"]
      inferred_preferences: string[]; // ["prefers comfortable over trendy"]
      life_context: string[]; // ["works in tech", "has twins"]
      event_mentions: string[]; // ["upcoming wedding", "beach vacation"]
    };

    // Outcome
    outcome?: 'resolved' | 'escalated' | 'abandoned';
    products_clicked?: string[];
    products_purchased?: string[];
  };
}

export interface ChatMessage {
  message_id: string;
  role: 'customer' | 'assistant' | 'system';
  content: string;
  timestamp: string;

  // If message includes product recommendations
  product_recommendations?: Array<{
    product_id: string;
    recommendation_reason: string;
  }>;

  // If customer clicks a product
  clicked_products?: string[];
}

// ============================================================================
// 7. PRODUCT HIDE (Negative Signal)
// ============================================================================

export interface ProductHideInteraction extends BaseInteraction {
  interaction_type: 'product_hide';
  data: {
    product_id: string;
    product_name?: string;
    brand?: string;
    hide_reason?: string; // Optional user-selected reason

    // Context - where did they hide it from?
    hidden_from: 'recommendation' | 'search' | 'browse' | 'email';
    hidden_from_id?: string;

    // Product attributes (for negative signal extraction)
    product_attributes?: {
      pillars?: string[];
      colors?: string[];
      materials?: string[];
      category?: string;
      price?: number;
    };
  };
}

// ============================================================================
// 8. PRODUCT VIEW / CLICK (Implicit Signals)
// ============================================================================

export interface ProductViewInteraction extends BaseInteraction {
  interaction_type: 'product_view' | 'product_click';
  data: {
    product_id: string;
    product_name?: string;
    dwell_time_ms: number;

    // Context
    viewed_from: 'search' | 'browse' | 'recommendation' | 'outfit' | 'email';
    viewed_from_id?: string;

    // Product attributes
    product_attributes?: {
      pillars?: string[];
      colors?: string[];
      category?: string;
      price?: number;
    };

    // Actions taken
    actions?: {
      scrolled_to_images: boolean;
      opened_size_guide: boolean;
      opened_reviews: boolean;
      added_to_cart: boolean;
      added_to_wishlist: boolean;
    };
  };
}

// ============================================================================
// 9. SEARCH (Query Intent)
// ============================================================================

export interface SearchInteraction extends BaseInteraction {
  interaction_type: 'search';
  data: {
    search_query: string;
    search_type: 'text' | 'image' | 'voice';

    // Results
    result_count: number;
    clicked_results: Array<{
      product_id: string;
      position: number; // Position in search results
      clicked: boolean;
    }>;

    // Refinements
    filters_applied?: {
      categories?: string[];
      brands?: string[];
      price_range?: { min: number; max: number };
      colors?: string[];
      sizes?: string[];
    };

    // Semantic extraction from query
    query_intent?: {
      occasion?: string; // "date night dress"
      style?: string[]; // "bohemian maxi dress"
      colors?: string[]; // "red dress"
    };
  };
}

// ============================================================================
// 10. OUTFIT SAVE / EDIT (Outfit Builder)
// ============================================================================

export interface OutfitSaveInteraction extends BaseInteraction {
  interaction_type: 'outfit_save' | 'outfit_edit';
  data: {
    outfit_id: string;
    outfit_name?: string;

    // Items in outfit
    items: Array<{
      product_id: string;
      role: string; // "top", "bottom", "shoes", etc.
      replaced?: boolean; // Did they swap this item?
      original_item?: string; // If replaced, what was the original?
    }>;

    // Outfit attributes
    outfit_attributes?: {
      pillars?: string[];
      occasion?: string;
      formality?: number;
      season?: string[];
    };

    // Actions
    saved_to_wishlist: boolean;
    purchased_items?: string[];
    shared: boolean;
  };
}

// ============================================================================
// UNIFIED INTERACTION LOG
// ============================================================================

/**
 * Union type of all interaction types
 * This is what gets stored in the interactions table
 */
export type Interaction =
  | StyleSwipeInteraction
  | StyleQuizInteraction
  | PurchaseInteraction
  | WishlistAddInteraction
  | RequestALookInteraction
  | AIChatInteraction
  | ProductHideInteraction
  | ProductViewInteraction
  | SearchInteraction
  | OutfitSaveInteraction;

// ============================================================================
// DATABASE SCHEMA (for Supabase)
// ============================================================================

/**
 * How this maps to a Supabase table:
 *
 * CREATE TABLE customer_interactions (
 *   interaction_id TEXT PRIMARY KEY,
 *   customer_id TEXT NOT NULL,
 *   interaction_type TEXT NOT NULL,
 *   timestamp TIMESTAMPTZ NOT NULL,
 *   session_id TEXT,
 *   source TEXT NOT NULL,
 *   data JSONB NOT NULL,  -- Stores the type-specific data
 *   metadata JSONB,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *
 *   -- Indexes
 *   INDEX idx_customer_id (customer_id),
 *   INDEX idx_interaction_type (interaction_type),
 *   INDEX idx_timestamp (timestamp),
 *   INDEX idx_session_id (session_id)
 * );
 *
 * The JSONB data field stores the type-specific interaction data.
 * This gives us flexibility while maintaining queryability.
 */
