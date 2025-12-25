#!/usr/bin/env node

/**
 * AI Blog Content Generation Script
 * Uses OpenRouter API to generate professional blog posts
 *
 * Usage: node scripts/generate-blog.js "Blog Topic" "keyword"
 * Example: node scripts/generate-blog.js "Tax Deductions for Restaurants" "restaurant tax deductions"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Validate environment variables
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ Error: OPENROUTER_API_KEY not found in .env file');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('❌ Usage: node scripts/generate-blog.js "Blog Topic" "keyword (optional)"');
  console.error('Example: node scripts/generate-blog.js "Tax Deductions for Restaurants" "restaurant taxes"');
  process.exit(1);
}

const topic = args[0];
const keyword = args[1] || topic;

console.log(`\n🤖 Generating blog post about: "${topic}"`);
console.log(`🎯 Target keyword: "${keyword}"\n`);

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt for blog generation
const systemPrompt = `You are an expert CPA and accounting content writer.
Create professional, SEO-optimized blog posts for AccountingBrains, a CPA firm.

Guidelines:
- Write in a professional yet approachable tone
- Include practical, actionable advice
- Use real-world examples
- Optimize for SEO with natural keyword usage
- Format in Markdown with proper headings (##, ###)
- Include a compelling introduction and strong conclusion
- Add a disclaimer at the end
- Target length: 1000-1500 words
- Include relevant tax code references where applicable
- Focus on providing genuine value to small business owners`;

async function generateBlogPost(topic, keyword) {
  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: 'anthropic/claude-3.5-sonnet', // High-quality model for content
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Write a comprehensive blog post about: "${topic}"\n\nTarget keyword: "${keyword}"\n\nInclude:\n1. A compelling title\n2. Meta description (150-160 characters)\n3. Main content in Markdown format\n4. Relevant categories and tags\n5. Estimated reading time\n\nFormat the response as JSON with these fields:\n- title\n- description\n- category (one of: Tax Planning, Bookkeeping, Payroll, Business Tips, Financial Strategy, CPA Insights)\n- tags (array of 4-6 relevant tags)\n- readTime (in minutes)\n- content (markdown formatted body)`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://accountingbrains.com',
          'X-Title': 'AccountingBrains Blog Generator'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    // Try to parse as JSON, fallback to plain text
    let blogData;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      blogData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.log('⚠️  AI response was not JSON, creating manual structure...');
      // Extract title from first # heading
      const titleMatch = aiResponse.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : topic;

      blogData = {
        title: title,
        description: `Expert insights on ${topic} from our CPA team.`,
        category: 'CPA Insights',
        tags: [keyword.toLowerCase().replace(/\s+/g, '-'), 'accounting', 'small-business'],
        readTime: Math.ceil(aiResponse.split(' ').length / 200),
        content: aiResponse
      };
    }

    return blogData;
  } catch (error) {
    console.error('❌ Error calling OpenRouter API:', error.response?.data || error.message);
    throw error;
  }
}

async function saveToFile(blogData) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = blogData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const filename = `${dateStr}-${slug}.md`;
  const filepath = path.join(__dirname, '..', 'src', 'blog', filename);

  // Create frontmatter
  const frontmatter = `---
layout: post.njk
title: "${blogData.title}"
description: "${blogData.description}"
date: ${date.toISOString()}
author: "AccountingBrains Team"
category: "${blogData.category}"
tags: ${JSON.stringify(['posts', ...blogData.tags])}
readTime: ${blogData.readTime}
---

${blogData.content}
`;

  // Ensure blog directory exists
  const blogDir = path.join(__dirname, '..', 'src', 'blog');
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
  }

  fs.writeFileSync(filepath, frontmatter);
  console.log(`✅ Blog post saved to: ${filepath}`);
  console.log(`📄 Title: ${blogData.title}`);
  console.log(`📊 Category: ${blogData.category}`);
  console.log(`⏱️  Read time: ${blogData.readTime} minutes`);
  console.log(`🏷️  Tags: ${blogData.tags.join(', ')}`);

  return filepath;
}

// Main execution
(async () => {
  try {
    console.log('⏳ Generating content with AI...\n');
    const blogData = await generateBlogPost(topic, keyword);

    console.log('\n💾 Saving to file...');
    const filepath = await saveToFile(blogData);

    console.log('\n✨ Success! Blog post generated and saved.');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review and edit: ${filepath}`);
    console.log(`   2. Add featured image if desired`);
    console.log(`   3. Commit and push to deploy`);
    console.log(`\n🚀 The post will appear on your blog automatically!\n`);
  } catch (error) {
    console.error('\n❌ Failed to generate blog post');
    process.exit(1);
  }
})();
