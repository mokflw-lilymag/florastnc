const fs = require('fs');
const path = 'd:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix setIsAnonymous
content = content.replace(
  'const [setIsAnonymous] = useState(false);',
  ''
);

// Fix setOrderType
content = content.replace(
  'const [ setOrderType] = useState<OrderType>("store"); // Hidden/Default',
  'const [orderType, setOrderType] = useState<OrderType>("store");'
);

// Fix auth
content = content.replace(
  'const { user } = useAuth();',
  'const { user, profile, tenantId, isLoading: authLoading } = useAuth();'
);

// Fix selectedBranch init
if (!content.includes('Initialize selectedBranch from profile')) {
  content = content.replace(
    'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);',
    'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);\n\n  // Initialize selectedBranch from profile\n  useEffect(() => {\n    if (tenantId && !selectedBranch) {\n      setSelectedBranch({ id: tenantId, name: profile?.tenants?.name || \'매장\' });\n    }\n  }, [tenantId, profile, selectedBranch]);'
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed page.tsx');
