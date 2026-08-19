with open(r'c:\Users\kevin\Documents\Kevinours\Tarot\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('main.css block', '/* --- styles/main.css ---'),
    ('table.css block', '/* --- styles/table.css ---'),
    ('cards.css block', '/* --- styles/cards.css ---'),
    ('<script> tag', '<script>'),
    ('<style> tag', '<style>'),
    ('.tarot-table {', '.tarot-table {'),
    ('player-slot north', 'player-slot north'),
    ('DOMContentLoaded', 'DOMContentLoaded'),
    ('class UIController', 'class UIController'),
    ('class GameStateMachine', 'class GameStateMachine'),
]

all_ok = True
for name, marker in checks:
    count = content.count(marker)
    status = 'OK' if count == 1 else ('ERROR count=' + str(count))
    print(status + '  ' + name)
    if count != 1:
        all_ok = False

print('Total lines: ' + str(content.count('\n')))
print('BUNDLE OK' if all_ok else 'BUNDLE HAS ERRORS')
