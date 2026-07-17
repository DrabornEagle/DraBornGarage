from pathlib import Path

path = Path('src/components/ReportsDashboard.tsx')
text = path.read_text(encoding='utf-8')
actual = '''      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Ekip, tahsilat ve servis özeti" icon="business" accent={colors.cyan} onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Kendi işlerin ve kayıtların" icon="person" accent={colors.orange} onPress={() => setViewMode('personal')} />'''
normalized = '''      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Toplam gelir ve tüm Ustalar" icon="business" accent={colors.primary} onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Yalnız kendi işlerin" icon="person" accent={colors.cyan} onPress={() => setViewMode('personal')} />'''
if actual not in text:
    raise SystemExit('report source normalization match not found')
path.write_text(text.replace(actual, normalized, 1), encoding='utf-8')
