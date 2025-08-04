#!/usr/bin/env node

const adminKey = process.env.OPENAI_ADMIN_KEY;
const keyToCheck = process.argv[2];

if (!adminKey) {
  console.error('Error: OPENAI_ADMIN_KEY environment variable required (needs billing permissions)');
  process.exit(1);
}

if (!keyToCheck) {
  console.error('Usage: npm run check-usage -- <api-key-id-to-check>');
  console.error('Example: npm run check-usage -- sk-proj-abc123');
  process.exit(1);
}

async function checkUsage() {
  try {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (30 * 24 * 60 * 60); // Last 30 days
    
    const params = new URLSearchParams({
      start_time: startTime.toString(),
      end_time: endTime.toString(),
      bucket_width: '1d',
      'api_key_ids[]': keyToCheck,
      'group_by[]': 'api_key_id'
    });
    
    const response = await fetch(`https://api.openai.com/v1/organization/usage/completions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Invalid admin key or insufficient permissions. Admin key needs billing access.');
      } else {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`);
        console.error(errorText);
      }
      process.exit(1);
    }

    const data = await response.json();
    
    // Model pricing (approximate, update as needed)
    const pricing = {
      'gpt-4o': { input: 2.50, output: 10.00 }, // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'dall-e-3': { standard: 0.04, hd: 0.08 }, // per image
      'dall-e-2': { '1024x1024': 0.02, '512x512': 0.018, '256x256': 0.016 }
    };
    
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let modelUsage = {};
    
    if (data.data && data.data.length > 0) {
      data.data.forEach(bucket => {
        const inputTokens = bucket.input_tokens || 0;
        const outputTokens = bucket.output_tokens || 0;
        const model = bucket.model || 'unknown';
        
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        
        if (!modelUsage[model]) {
          modelUsage[model] = { input: 0, output: 0, requests: 0 };
        }
        modelUsage[model].input += inputTokens;
        modelUsage[model].output += outputTokens;
        modelUsage[model].requests += bucket.num_requests || 0;
        
        // Calculate cost
        if (pricing[model]) {
          const inputCost = (inputTokens / 1000000) * (pricing[model].input || 0);
          const outputCost = (outputTokens / 1000000) * (pricing[model].output || 0);
          totalCost += inputCost + outputCost;
        }
      });
    }
    
    console.log(`\n📊 OpenAI Usage Summary (Last 30 days)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`API Key: ${keyToCheck}`);
    console.log(`Total estimated cost: $${totalCost.toFixed(4)}`);
    console.log(`Total tokens: ${(totalInputTokens + totalOutputTokens).toLocaleString()}`);
    console.log(`  • Input tokens: ${totalInputTokens.toLocaleString()}`);
    console.log(`  • Output tokens: ${totalOutputTokens.toLocaleString()}`);
    
    if (Object.keys(modelUsage).length > 0) {
      console.log(`\n📈 Usage by model:`);
      Object.entries(modelUsage).forEach(([model, usage]) => {
        const modelCost = pricing[model] ? 
          ((usage.input / 1000000) * (pricing[model].input || 0) + 
           (usage.output / 1000000) * (pricing[model].output || 0)).toFixed(4) : 
          'N/A';
        console.log(`  ${model}:`);
        console.log(`    • Requests: ${usage.requests.toLocaleString()}`);
        console.log(`    • Tokens: ${(usage.input + usage.output).toLocaleString()}`);
        console.log(`    • Est. cost: $${modelCost}`);
      });
    }
  } catch (error) {
    console.error('Error fetching usage:', error.message);
    process.exit(1);
  }
}

checkUsage();