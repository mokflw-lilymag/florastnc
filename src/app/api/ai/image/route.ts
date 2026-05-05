import { NextRequest, NextResponse } from 'next/server';
import { errAdminOperationFailed } from '@/lib/admin/admin-api-errors';
import { hqApiUiBase } from '@/lib/hq/hq-api-locale';

export async function POST(req: NextRequest) {
  try {
    const { prompt, theme, style, count = 2 } = await req.json(); // 기본 2장으로 최적화
    const apiKey = process.env.POLLINATIONS_API_KEY;

    const styleKeywords: Record<string, string> = {
      photo: "hyper-realistic premium photography, cinematic lighting, 8k",
      illustration: "whimsical digital illustration, clean artistic lines, vibrant",
      oil_painting: "textured oil painting, thick brushstrokes, museum quality",
      watercolor: "soft ethereal watercolor painting, hand-painted aesthetic",
      line_art: "elegant minimalist line art, continuous vector drawing, clean lines"
    };

    const selectedStyle = styleKeywords[style as keyof typeof styleKeywords] || styleKeywords.photo;
    const timestamp = Date.now();
    const finalPrompt = `FRAMELESS MACRO TEXTURE. Edge-to-edge full bleed background covering the entire frame. STRICTLY NO borders, NO margins, NO frames, NO white edges, NO polaroid effects, NO humans, NO people, NO figures. A beautiful pure background texture with ${prompt}, ${theme} theme, in ${selectedStyle} style. 100% NO text, NO typography, NO alphabets, NO symbols. Abstract pattern or continuous botanical texture only, clear uncluttered area, subtle design, masterpiece, high quality, 8k --v ${timestamp}`;

    console.log(`--- [SERVER] AI Multi-Image Generation (${count} images) ---`);

    // 병렬 생성을 위해 여러 개의 프로미스 생성
    const generationPromises = Array.from({ length: count }).map(async (_, idx) => {
      const seed = Math.floor(Math.random() * 2147483647);
      let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`;
      if (apiKey) pollinationsUrl += `&key=${apiKey}`;

      const headers: Record<string, string> = {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      try {
        const response = await fetch(pollinationsUrl, { headers, next: { revalidate: 0 } });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString('base64');
          return { url: `data:image/webp;base64,${base64Image}`, seed, success: true };
        } else {
          // Pro 실패 시 Fallback
          const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            const buffer = await fallbackRes.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');
            return { url: `data:image/webp;base64,${base64Image}`, seed, success: true, engine: 'fallback' };
          }
        }
      } catch (e) {
        console.error(`Image ${idx} generation failed`, e);
      }
      return null;
    });

    const results = (await Promise.all(generationPromises)).filter(r => r !== null);

    if (results.length === 0) {
      throw new Error('이미지 생성에 모두 실패했습니다.');
    }

    console.log(`--- [SERVER] Multi-Generation Success (${results.length} images) ---`);

    return NextResponse.json({ 
      images: results, // 배열로 반환
      success: true
    });

  } catch (error: unknown) {
    console.error('AI Multi-Route Error:', error);
    const bl = await hqApiUiBase(req);
    return NextResponse.json(
      { error: errAdminOperationFailed(bl) },
      { status: 500 }
    );
  }
}
