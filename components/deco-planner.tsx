'use client';

import { useState, useTransition } from 'react';

import { AlertCircle, ArrowDown, ArrowUp, Plus, Waves, X } from 'lucide-react';

import type { DecoGas, DiveSegment, PlannerResult } from '@/lib/deco/buhlmann';
import { planDive } from '@/lib/deco/buhlmann';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type EditableSegment = DiveSegment & {
  id: string;
};

type EditableGas = {
  id: string;
  label: string;
  oxygenPercent: number;
  heliumPercent: number;
  switchDepthMeters: number;
};

type PlannerSettings = {
  gradientFactorLow: number;
  gradientFactorHigh: number;
  descentRateMetersPerMinute: number;
  ascentRateMetersPerMinute: number;
};

const initialSettings: PlannerSettings = {
  gradientFactorLow: 30,
  gradientFactorHigh: 85,
  descentRateMetersPerMinute: 20,
  ascentRateMetersPerMinute: 10,
};

function createInitialSegments(): EditableSegment[] {
  return [
    { id: crypto.randomUUID(), depthMeters: 36, durationMinutes: 20 },
    { id: crypto.randomUUID(), depthMeters: 24, durationMinutes: 8 },
  ];
}

function createInitialDecoGases(): EditableGas[] {
  return [
    {
      id: crypto.randomUUID(),
      label: 'EAN50',
      oxygenPercent: 50,
      heliumPercent: 0,
      switchDepthMeters: 21,
    },
    {
      id: crypto.randomUUID(),
      label: 'Oxygen',
      oxygenPercent: 100,
      heliumPercent: 0,
      switchDepthMeters: 6,
    },
  ];
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentToFraction(percent: number) {
  return percent / 100;
}

function formatMinutes(minutes: number) {
  if (minutes >= 10) {
    return `${round(minutes, 0)} min`;
  }

  return `${round(minutes, 1)} min`;
}

function summarizeGas(oxygenPercent: number, heliumPercent: number) {
  const nitrogenPercent = Math.max(0, 100 - oxygenPercent - heliumPercent);
  return `${oxygenPercent}/${heliumPercent}/${nitrogenPercent}`;
}

export function DecoPlanner() {
  const [segments, setSegments] = useState(createInitialSegments);
  const [backGas, setBackGas] = useState<EditableGas>({
    id: 'back-gas',
    label: 'Back Gas',
    oxygenPercent: 21,
    heliumPercent: 35,
    switchDepthMeters: 999,
  });
  const [decoGases, setDecoGases] = useState(createInitialDecoGases);
  const [settings, setSettings] = useState(initialSettings);
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxDepthMeters = Math.max(...segments.map((segment) => segment.depthMeters), 0);

  const handleCalculate = () => {
    setError(null);

    startTransition(() => {
      try {
        const plannerBackGas: DecoGas = {
          id: backGas.id,
          label: backGas.label,
          oxygenFraction: percentToFraction(backGas.oxygenPercent),
          heliumFraction: percentToFraction(backGas.heliumPercent),
          switchDepthMeters: backGas.switchDepthMeters,
        };

        const plannerDecoGases: DecoGas[] = decoGases.map((gas) => ({
          id: gas.id,
          label: gas.label || `Deco ${gas.oxygenPercent}/${gas.heliumPercent}`,
          oxygenFraction: percentToFraction(gas.oxygenPercent),
          heliumFraction: percentToFraction(gas.heliumPercent),
          switchDepthMeters: gas.switchDepthMeters,
        }));

        setResult(
          planDive(segments, plannerBackGas, plannerDecoGases, {
            gradientFactorLow: percentToFraction(settings.gradientFactorLow),
            gradientFactorHigh: percentToFraction(settings.gradientFactorHigh),
            descentRateMetersPerMinute: settings.descentRateMetersPerMinute,
            ascentRateMetersPerMinute: settings.ascentRateMetersPerMinute,
          })
        );
      } catch (calculationError) {
        setResult(null);
        setError(
          calculationError instanceof Error
            ? calculationError.message
            : 'The planner could not calculate a schedule.'
        );
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 py-10 sm:py-16">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader className="gap-4">
            <Badge variant="outline" className="w-fit">
              Buhlmann ZHL-16C + GF
            </Badge>
            <div className="space-y-3">
              <CardTitle className="text-3xl leading-tight sm:text-4xl">
                Plan a staged ascent from a segment-based profile
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed">
                Enter your bottom profile, one back gas, and planned deco gases. The planner
                calculates ceilings, first stop depth, total runtime, gas switches, and a stop-by-stop
                ascent schedule using 3 meter stops.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Waves className="h-5 w-5" />
              What you will see
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <p>
              The planner treats each profile row as a target depth followed by hold time on the
              back gas. During ascent it switches to the richest valid deco gas once you reach that
              gas&apos;s switch depth.
            </p>
            <p>
              Results show the mandatory stops, the gas used at each stop, the first stop depth, and
              total time to surface from the end of the bottom profile.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile segments</CardTitle>
              <CardDescription>
                Each row is a target depth and hold time. Travel between rows uses the configured
                ascent or descent rate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Depth (m)</TableHead>
                      <TableHead>Time (min)</TableHead>
                      <TableHead className="w-[80px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((segment, index) => (
                      <TableRow key={segment.id}>
                        <TableCell className="font-medium">#{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={segment.depthMeters}
                            onChange={(event) => {
                              const depthMeters = Number(event.target.value);
                              setSegments((current) =>
                                current.map((entry) =>
                                  entry.id === segment.id ? { ...entry, depthMeters } : entry
                                )
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={segment.durationMinutes}
                            onChange={(event) => {
                              const durationMinutes = Number(event.target.value);
                              setSegments((current) =>
                                current.map((entry) =>
                                  entry.id === segment.id ? { ...entry, durationMinutes } : entry
                                )
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={segments.length === 1}
                            onClick={() => {
                              setSegments((current) => current.filter((entry) => entry.id !== segment.id));
                            }}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove segment {index + 1}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSegments((current) => [
                    ...current,
                    {
                      id: crypto.randomUUID(),
                      depthMeters: current[current.length - 1]?.depthMeters ?? 21,
                      durationMinutes: 5,
                    },
                  ]);
                }}
              >
                <Plus className="h-4 w-4" />
                Add segment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gases</CardTitle>
              <CardDescription>
                Fractions are entered as percentages. Nitrogen is calculated from the remainder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm font-medium">Back gas</Label>
                    <Badge variant="outline">
                      {summarizeGas(backGas.oxygenPercent, backGas.heliumPercent)}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="back-o2">Oxygen %</Label>
                      <Input
                        id="back-o2"
                        type="number"
                        min={1}
                        max={100}
                        value={backGas.oxygenPercent}
                        onChange={(event) => {
                          const oxygenPercent = Number(event.target.value);
                          setBackGas((current) => ({ ...current, oxygenPercent }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="back-he">Helium %</Label>
                      <Input
                        id="back-he"
                        type="number"
                        min={0}
                        max={100}
                        value={backGas.heliumPercent}
                        onChange={(event) => {
                          const heliumPercent = Number(event.target.value);
                          setBackGas((current) => ({ ...current, heliumPercent }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="back-max-depth">Profile max depth</Label>
                      <Input id="back-max-depth" value={`${maxDepthMeters} m`} disabled readOnly />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Deco gases</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDecoGases((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            label: `Deco ${current.length + 1}`,
                            oxygenPercent: 80,
                            heliumPercent: 0,
                            switchDepthMeters: 9,
                          },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add deco gas
                    </Button>
                  </div>

                  {decoGases.map((gas, index) => (
                    <div key={gas.id} className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <Input
                          value={gas.label}
                          onChange={(event) => {
                            const label = event.target.value;
                            setDecoGases((current) =>
                              current.map((entry) => (entry.id === gas.id ? { ...entry, label } : entry))
                            );
                          }}
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            setDecoGases((current) => current.filter((entry) => entry.id !== gas.id));
                          }}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove deco gas {index + 1}</span>
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-2">
                          <Label>Oxygen %</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={gas.oxygenPercent}
                            onChange={(event) => {
                              const oxygenPercent = Number(event.target.value);
                              setDecoGases((current) =>
                                current.map((entry) =>
                                  entry.id === gas.id ? { ...entry, oxygenPercent } : entry
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Helium %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={gas.heliumPercent}
                            onChange={(event) => {
                              const heliumPercent = Number(event.target.value);
                              setDecoGases((current) =>
                                current.map((entry) =>
                                  entry.id === gas.id ? { ...entry, heliumPercent } : entry
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Switch depth (m)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={gas.switchDepthMeters}
                            onChange={(event) => {
                              const switchDepthMeters = Number(event.target.value);
                              setDecoGases((current) =>
                                current.map((entry) =>
                                  entry.id === gas.id ? { ...entry, switchDepthMeters } : entry
                                )
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mix</Label>
                          <Input
                            value={summarizeGas(gas.oxygenPercent, gas.heliumPercent)}
                            disabled
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planner settings</CardTitle>
              <CardDescription>
                Gradient factors control how conservative the ascent is. Travel rates are meters per minute.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="gf-low">GF low</Label>
                  <Input
                    id="gf-low"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.gradientFactorLow}
                    onChange={(event) => {
                      const gradientFactorLow = Number(event.target.value);
                      setSettings((current) => ({ ...current, gradientFactorLow }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gf-high">GF high</Label>
                  <Input
                    id="gf-high"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.gradientFactorHigh}
                    onChange={(event) => {
                      const gradientFactorHigh = Number(event.target.value);
                      setSettings((current) => ({ ...current, gradientFactorHigh }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descent-rate">Descent rate</Label>
                  <Input
                    id="descent-rate"
                    type="number"
                    min={1}
                    value={settings.descentRateMetersPerMinute}
                    onChange={(event) => {
                      const descentRateMetersPerMinute = Number(event.target.value);
                      setSettings((current) => ({ ...current, descentRateMetersPerMinute }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ascent-rate">Ascent rate</Label>
                  <Input
                    id="ascent-rate"
                    type="number"
                    min={1}
                    value={settings.ascentRateMetersPerMinute}
                    onChange={(event) => {
                      const ascentRateMetersPerMinute = Number(event.target.value);
                      setSettings((current) => ({ ...current, ascentRateMetersPerMinute }));
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={handleCalculate} disabled={isPending}>
                  {isPending ? 'Calculating…' : 'Calculate schedule'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSegments(createInitialSegments());
                    setBackGas({
                      id: 'back-gas',
                      label: 'Back Gas',
                      oxygenPercent: 21,
                      heliumPercent: 35,
                      switchDepthMeters: 999,
                    });
                    setDecoGases(createInitialDecoGases());
                    setSettings(initialSettings);
                    setResult(null);
                    setError(null);
                  }}
                >
                  Reset example
                </Button>
              </div>

              {error ? (
                <div className="border-destructive/30 bg-destructive/5 mt-4 rounded-lg border p-4 text-sm">
                  <div className="text-destructive flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Calculation issue
                  </div>
                  <p className="text-muted-foreground mt-2 leading-6">{error}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule summary</CardTitle>
              <CardDescription>
                {result
                  ? 'The schedule below includes ascent travel and all required decompression stops.'
                  : 'Run the planner to see first stop depth, decompression time, and the full ascent plan.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="py-4">
                    <CardContent className="space-y-1 py-0">
                      <p className="text-muted-foreground text-sm">Total runtime</p>
                      <p className="text-2xl font-semibold">{formatMinutes(result.totalRuntimeMinutes)}</p>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="space-y-1 py-0">
                      <p className="text-muted-foreground text-sm">Time to surface</p>
                      <p className="text-2xl font-semibold">{formatMinutes(result.timeToSurfaceMinutes)}</p>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="space-y-1 py-0">
                      <p className="text-muted-foreground text-sm">First stop</p>
                      <p className="text-2xl font-semibold">
                        {result.firstStopMeters === null ? 'No deco stop' : `${result.firstStopMeters} m`}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="space-y-1 py-0">
                      <p className="text-muted-foreground text-sm">Mandatory stops</p>
                      <p className="text-2xl font-semibold">{result.stops.length}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm leading-6">
                  No schedule yet. The example profile is prefilled so you can calculate immediately or edit it first.
                </div>
              )}
            </CardContent>
          </Card>

          {result?.warnings.length ? (
            <Card className="border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-lg">Warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6">
                {result.warnings.map((warning) => (
                  <div key={warning} className="bg-yellow-500/8 rounded-lg border border-yellow-500/20 p-3">
                    {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {result?.gasSwitches.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gas switches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.gasSwitches.map((switchEvent) => (
                  <div
                    key={`${switchEvent.depthMeters}-${switchEvent.gasId}`}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>{switchEvent.gasLabel}</span>
                    <Badge variant="outline">{switchEvent.depthMeters} m</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ascent plan</CardTitle>
              <CardDescription>
                Travel segments show the ascent between stops. Stop rows show the required hold time and gas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phase</TableHead>
                        <TableHead>Depth</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Gas</TableHead>
                        <TableHead className="text-right">GF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.plan
                        .filter((entry) => entry.type === 'travel' || entry.type === 'stop')
                        .map((entry, index) => (
                          <TableRow key={`${entry.type}-${index}`}>
                            <TableCell className="font-medium">
                              {entry.type === 'travel' ? (
                                <span className="inline-flex items-center gap-2">
                                  {entry.toDepthMeters < entry.fromDepthMeters ? (
                                    <ArrowUp className="h-4 w-4" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4" />
                                  )}
                                  Travel
                                </span>
                              ) : (
                                'Stop'
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.type === 'travel'
                                ? `${entry.fromDepthMeters} → ${entry.toDepthMeters} m`
                                : `${entry.depthMeters} m`}
                            </TableCell>
                            <TableCell>{formatMinutes(entry.durationMinutes)}</TableCell>
                            <TableCell>{entry.gasLabel}</TableCell>
                            <TableCell className="text-right">
                              {entry.type === 'stop' ? `${round(entry.gradientFactor * 100, 0)}%` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm leading-6">
                  The ascent plan appears here after a successful calculation.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
