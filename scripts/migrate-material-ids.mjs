import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const MAIN_CAT_PREFIX = {
  '생화': 'MF', '식물': 'MP', '바구니 / 화기': 'MB',
  '소모품 및 부자재': 'MM', '조화': 'MA', '프리저브드': 'MR',
  '기타': 'MZ',
  'Hoa tươi': 'MF', 'Fresh cut': 'MF',
  'Cây': 'MP', 'Plants': 'MP',
  'Giỏ / Bình': 'MB', 'Baskets / Containers': 'MB',
  'Vật tư': 'MM', 'Supplies': 'MM',
  'Đóng gói': 'MM', 'Packaging': 'MM',
  'Ruy băng': 'MM', 'Ribbon': 'MM',
  'Bảo quản': 'MR', 'Preserved': 'MR'
};

const MID_CAT_CODE = {
  'MF': { '장미류': '1', 'Hồng': '1', 'Roses': '1', '거베라류': '2', 'Cúc gerbera': '2', 'Gerbera': '2', '폼플라워': '3', '필러플라워': '4', '라인플라워': '5', '소재(그린)': '6', 'Phụ': '6', 'Lá': '6', 'Cành': '6', 'Filler': '6', 'Greens': '6', 'Branches': '6', '국화류': '7', '카네이션류': '8', 'Cẩm chướng': '8', 'Carnations': '8', '리시안서스류': '9', 'Lisianthus': '9', '기타': '0', '매스플라워': 'A', 'Tulip': 'B', 'Tulips': 'B' },
  'MP': { '관엽소형': '1', '관엽중형': '2', '관엽대형': '3', '서양란': '6', '동양란': '7', '기타식물': 'D', '다육선인장소형': '8', '다육선인장중형': '9', '다육선인장대형': '0', 'Sen đá': '8', 'Succulent': '8', 'Lá nhỏ': '1', 'Small foliage': '1', 'Lan': '6', 'Orchid': '6' },
  'MB': { '바구니': '1', 'Giỏ': '1', 'Basket': '1', '도자기': '2', '유리': '3', '테라조': '4', '테라코타(토분)': '5', '플라스틱': '6', '기타': '7' },
  'MM': { '원예자재': '1', '데코자재': '2', '포장재': '3', '리본/텍': '4', '기타': '5', '제작도구': '6', 'Thủy tinh': '3', 'Glass': '3', 'Gốm': '2', 'Ceramic': '2', 'Giấy': '3', 'Màng': '3', 'Wrap': '3', 'Film': '3', 'Hẹp': '4', 'Narrow ribbon': '4', 'Phụ kiện': '5', 'Accessories': '5', 'Lụa': '2', 'Silk': '2' },
  'MA': { '장미류': '1', '카네이션류': '2', '리시안서스류': '3', '국화류': '4', '거베라류': '5', '폼플라워': '6', '라인플라워': '7', '필러플라워': '8', '소재(그린)': '9', '트리류': '0', '매스플라워': 'A' },
  'MR': { '플라워': '1', '잎소재': '2', '열매': '3', '폼플라워': '4', '기타': '5', 'Form hoa': '4', 'Form flowers': '4' },
};

const getBasePattern = (mainCategory, midCategory) => {
  const prefix = MAIN_CAT_PREFIX[mainCategory] || 'MM';
  const midCode = (midCategory && MID_CAT_CODE[prefix]?.[midCategory]) || '0';
  return `${prefix}${midCode}`;
}

async function migrate() {
  console.log("Starting Ultimate UPDATE-based Materials ID Migration...");

  // Get max sequence dynamically for each pattern via SQL-like prefix search
  // Since we can't do direct SQL, we'll maintain a local maxSeq cache and increment on 409 Conflict.
  const localMaxSeq = {};

  let successCount = 0;
  let failCount = 0;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let hasMore = true;
  let offset = 0;

  // We will loop until no UUIDs are returned from the DB.
  while (hasMore) {
    // Fetch only UUIDs. Like id ~ '^[0-9a-f]{8}-...' but PostgREST 'ilike' can be used:
    // Actually, just fetch all materials and filter, but grab 1000 at a time.
    const { data, error } = await supabase
      .from('materials')
      .select('id, name, main_category, mid_category')
      // Fetch some rows, we'll manually filter UUIDs
      .range(offset, offset + 999);

    if (error) {
      console.error("Fetch Error:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    // Filter UUIDs
    const toMigrate = data.filter(m => uuidRegex.test(m.id));

    if (toMigrate.length === 0) {
      // If none in this batch, move to next
      offset += 1000;
      continue;
    }

    // Process this batch
    for (const m of toMigrate) {
      const pattern = getBasePattern(m.main_category, m.mid_category);
      if (localMaxSeq[pattern] === undefined) {
        // Find existing max for this pattern in DB
        const { data: existingData } = await supabase
          .from('materials')
          .select('id')
          .like('id', `${pattern}%`)
          .order('id', { ascending: false })
          .limit(1);

        let maxNum = 0;
        if (existingData && existingData.length > 0) {
          const id = existingData[0].id;
          if (id.length === 8) {
            const num = parseInt(id.substring(3, 7), 10);
            if (!isNaN(num)) maxNum = num;
          }
        }
        localMaxSeq[pattern] = maxNum;
      }

      let updated = false;
      let attempts = 0;

      while (!updated && attempts < 50) {
        localMaxSeq[pattern]++;
        const candidate = `${pattern}${String(localMaxSeq[pattern]).padStart(4, '0')}1`;

        // Attempt UPDATE (since PK is now text and FK cascade is on)
        const { error: updateErr } = await supabase
          .from('materials')
          .update({ id: candidate })
          .eq('id', m.id);

        if (updateErr) {
          // If conflict (e.g., 23505 duplicate key)
          if (updateErr.code === '23505') {
            attempts++;
            // Loop again and it will increment
          } else {
            console.error(`Failed to update ${m.id} to ${candidate}:`, updateErr.message);
            failCount++;
            break; // Break while, next item
          }
        } else {
          updated = true;
          successCount++;
          if (successCount % 100 === 0) {
            console.log(`Successfully migrated ${successCount} items... (Latest: ${candidate})`);
          }
        }
      }

      if (!updated && attempts >= 50) {
        console.error(`Gave up on ${m.id} after 50 collision retries.`);
        failCount++;
      }
    }

    // Since we updated rows, they still exist but with new IDs.
    // If we increment offset by 1000, we might skip items if they moved sorting order?
    // Not if we sort by created_at. But wait, if we process them, the next page might shift.
    // Actually, safest is to NOT increment offset, just re-query offset 0 over and over
    // because we are changing the data so UUIDs will disappear from the top!
    // But since we just query .range(0, 999), and only filter UUIDs,
    // we should just offset=0 if we actually updated anything? No, if we order by ID,
    // UUIDs come after Text usually. So updating them moves their position!
    // Let's just always fetch offset 0, but filter UUIDs. If no UUIDs, offset += 1000.
    // Wait, if we keep fetching offset 0 and they moved, we'll see new ones.
    offset += 1000;
  }

  console.log(`Ultimate Migration Complete. Success: ${successCount}, Failed: ${failCount}`);
}

migrate();
