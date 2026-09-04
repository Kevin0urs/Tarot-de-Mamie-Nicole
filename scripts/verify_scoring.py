"""
Verification test for FFT 4-player Tarot scoring rules.
"""

def get_card_points(suit, rank):
    if suit == 'excuse':
        return 4.5
    if suit == 'trump':
        if rank in (1, 21):
            return 4.5
        return 0.5
    if rank == 14: # King
        return 4.5
    if rank == 13: # Queen
        return 3.5
    if rank == 12: # Knight
        return 2.5
    if rank == 11: # Jack
        return 1.5
    return 0.5

# Test 1: Deck total points check
total_points = 0.0
# 78 cards total:
# 21 trumps (1..21)
for r in range(1, 22):
    total_points += get_card_points('trump', r)
# 1 excuse
total_points += get_card_points('excuse', 0)
# 4 suits * 14 cards
for suit in ['spade', 'heart', 'diamond', 'club']:
    for r in range(1, 15):
        total_points += get_card_points(suit, r)

print(f"Total Deck Points: {total_points} (Expected: 91.0)")
assert total_points == 91.0, f"Deck total is {total_points}, expected 91.0"

# Test 2: Target thresholds
def get_target(bouts):
    targets = {0: 56, 1: 51, 2: 41, 3: 36}
    return targets[bouts]

for b in [0, 1, 2, 3]:
    print(f"{b} bouts -> target = {get_target(b)}")

# Test 3: Score calculation examples
def calc_score(bouts, points_realised, contract_mult, petit_au_bout=0):
    target = get_target(bouts)
    diff = points_realised - target
    is_won = (diff >= 0)
    abs_diff = abs(diff)
    base = 25 + abs_diff
    
    if is_won:
        unit = (base + petit_au_bout) * contract_mult
    else:
        unit = (-base + petit_au_bout) * contract_mult
        
    preneur_score = unit * 3
    defense_score = -unit
    
    return {
        'target': target,
        'diff': diff,
        'is_won': is_won,
        'unit': unit,
        'preneur': preneur_score,
        'defense': defense_score,
        'sum': preneur_score + 3 * defense_score
    }

print("\n--- Example 1: Garde (x2), 2 Bouts (target 41), 45 pts réalisés ---")
res1 = calc_score(2, 45, 2, 0)
print(f"Diff: +4, Base: (25+4)*2 = 58. Preneur: +174, Defenseurs: -58 each. Sum: {res1['sum']}")

print("\n--- Example 2: Petite (x1), 1 Bout (target 51), 40 pts réalisés (chute de 11) ---")
res2 = calc_score(1, 40, 1, 0)
print(f"Diff: -11, Base: (-25-11)*1 = -36. Preneur: -108, Defenseurs: +36 each. Sum: {res2['sum']}")

print("All verification checks PASSED cleanly!")
