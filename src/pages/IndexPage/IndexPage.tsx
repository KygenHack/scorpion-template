import { useEffect, useState, useMemo, FC } from 'react';
import Arrow from '@/icons/Arrow';
import { highVoltage, rocket, storge, trophy } from '@/images';
import Coins from '@/icons/Coins';
import { useInitData, useLaunchParams, type User } from '@tma.js/sdk-react';
import { Placeholder } from '@telegram-apps/telegram-ui';
import { DisplayDataRow } from '@/components/DisplayData/DisplayData';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/components/firebase';
import { initCloudStorage } from '@tma.js/sdk';
import { NavLink } from 'react-router-dom';

type BoostClicks = {
  x2: number;
  x3: number;
};

function getUserRows(user: User): DisplayDataRow[] {
  return [{ title: 'username', value: user.username }];
}

export const IndexPage: FC = () => {
  // const wallet = useTonWallet();
  // const utils = useUtils();
  const [cloudStorage] = useState(() => initCloudStorage());
  const initDataRaw = useLaunchParams().initDataRaw;
  const initData = useInitData();

  const initDataRows = useMemo(() => {
    if (!initData || !initDataRaw) return;
    const { hash, queryId, chatType, chatInstance, authDate, startParam, canSendAfter, canSendAfterDate } = initData;

    return [
      { title: 'raw', value: initDataRaw },
      { title: 'auth_date', value: authDate.toLocaleString() },
      { title: 'auth_date (raw)', value: authDate.getTime() / 1000 },
      { title: 'hash', value: hash },
      { title: 'can_send_after', value: canSendAfterDate?.toISOString() },
      { title: 'can_send_after (raw)', value: canSendAfter },
      { title: 'query_id', value: queryId },
      { title: 'start_param', value: startParam },
      { title: 'chat_type', value: chatType },
      { title: 'chat_instance', value: chatInstance },
    ];
  }, [initData, initDataRaw]);

  const userRows = useMemo(() => {
    return initData && initData.user ? getUserRows(initData.user) : undefined;
  }, [initData]);

  const Profile: FC<{ username: string }> = ({ username }) => <p>{username} (CEO)</p>;

  const levelNames = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Epic", "Legendary", "Master", "GrandMaster", "Lord"];
  const levelMinPoints = [0, 5000, 25000, 100000, 1000000, 2000000, 10000000, 50000000, 100000000, 1000000000];

  const [points, setPoints] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [clicks, setClicks] = useState<{ id: number, x: number, y: number, points: number }[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [boostMultiplier, setBoostMultiplier] = useState(1);
  const [boostClicks, setBoostClicks] = useState({ x2: 3, x3: 3 });
  const [restoreTime, setRestoreTime] = useState(0);
  const [boostTimeout, setBoostTimeout] = useState<number | null>(null);
  const [levelIndex, setLevelIndex] = useState(6);
  const [isWobbling, setIsWobbling] = useState(false);

  const pointsToAdd = 1;
  const energyToReduce = 100;
  const profitPerHour = 10420;

  useEffect(() => {
    const pointsPerSecond = Math.floor(profitPerHour / 3600);
    const interval = setInterval(() => {
      setPoints((prevPoints) => prevPoints + pointsPerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [profitPerHour]);

  const calculateProgress = () => {
    if (levelIndex >= levelNames.length - 1) return 100;
    const currentLevelMin = levelMinPoints[levelIndex];
    const nextLevelMin = levelMinPoints[levelIndex + 1];
    return Math.min(((points - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100, 100);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userRows || !userRows[0]?.value) return;
      const username = userRows[0].value as string;
      const sessionData = sessionStorage.getItem(`user_data_${username}`);
      const localData = localStorage.getItem(`user_data_${username}`);

      if (sessionData) {
        setUserData(JSON.parse(sessionData));
      } else if (localData) {
        setUserData(JSON.parse(localData));
        sessionStorage.setItem(`user_data_${username}`, JSON.stringify(localData));
      } else {
        try {
          const cloudData = await cloudStorage.get(`user_data_${username}`);
          if (cloudData) {
            setUserData(JSON.parse(cloudData));
            sessionStorage.setItem(`user_data_${username}`, JSON.stringify(cloudData));
            localStorage.setItem(`user_data_${username}`, JSON.stringify(cloudData));
          } else {
            const docRef = doc(db, "users", username);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserData(data);
              sessionStorage.setItem(`user_data_${username}`, JSON.stringify(data));
              localStorage.setItem(`user_data_${username}`, JSON.stringify(data));
            }
          }
        } catch (error) {
          console.error('Error fetching data from cloud:', error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [userRows, cloudStorage]);

  const setUserData = (data: any) => {
    setPoints(data.points || 0);
    setEnergy(data.energy || 0);
    setClicks(data.clicks || []);
    setCount(data.count || 0);
    setBoostClicks(data.boostClicks || { x2: 3, x3: 3 });
    setRestoreTime(data.restoreTime || Date.now());
    setLevelIndex(data.levelIndex || 0);
  };

  useEffect(() => {
    if (points >= levelMinPoints[levelIndex + 1] && levelIndex < levelNames.length - 1) {
      setLevelIndex(levelIndex + 1);
    } else if (points < levelMinPoints[levelIndex] && levelIndex > 0) {
      setLevelIndex(levelIndex - 1);
    }
  }, [points, levelIndex]);

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (energy - energyToReduce < 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pointsAdded = pointsToAdd * boostMultiplier;

    setPoints((prev) => prev + pointsAdded);
    setEnergy((prev) => Math.max(0, prev - energyToReduce));
    setClicks((prev) => [...prev, { id: Date.now(), x, y, points: pointsAdded }]);
    setCount((prev) => prev + 1);
    setIsWobbling(true);
    setTimeout(() => setIsWobbling(false), 1000);
  };

  const saveData = async () => {
    const userData = {
      points,
      energy,
      clicks,
      count,
      boostClicks,
      restoreTime,
      levelIndex,
      levelProgress: calculateProgress(),
    };

    sessionStorage.setItem(`user_data_${username}`, JSON.stringify(userData));
    localStorage.setItem(`user_data_${username}`, JSON.stringify(userData));
    await cloudStorage.set(`user_data_${username}`, JSON.stringify(userData));

    try {
      await setDoc(doc(db, "users", username), userData, { merge: true });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prevEnergy) => Math.min(prevEnergy + 10, 6500));
    }, 100); // Restore 10 energy points every second

    return () => clearInterval(interval); // Clear interval on component unmount
  }, []);


  useEffect(() => {
    if (!loading) saveData();
  }, [points, energy, clicks, count, boostClicks, restoreTime, loading]);

  const handleAnimationEnd = (id: number) => {
    setClicks((prev) => prev.filter((click) => click.id !== id));
  };

  const activateBoost = (multiplier: number, duration: number) => {
    const key = `x${multiplier}` as keyof BoostClicks;
    if (boostClicks[key] > 0) {
      setBoostMultiplier(multiplier);
      setBoostClicks((prev) => ({ ...prev, [key]: prev[key] - 1 }));
      setBoostTimeout(duration / 1000);
      const timeoutInterval = setInterval(() => {
        setBoostTimeout((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timeoutInterval);
            setBoostMultiplier(1);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  

  const username = userRows?.find((row) => row.title === 'username')?.value as string || '';

  if (!initDataRows) {
    return (
      <Placeholder
        header="Oops"
        description="Application was launched with missing init data"
      >
        <img
          alt="Telegram sticker"
          src="https://xelene.me/telegram.gif"
          style={{ display: 'block', width: '144px', height: '144px' }}
        />
      </Placeholder>
    );
  }

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium">
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      <div className="w-full z-10 min-h-screen flex flex-col items-center text-white">
        <div className="fixed top-0 left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
          <div className="flex items-center mt-4 w-3/3 border-2 border-[#43433b] rounded-full px-4 py-[2px] bg-[#43433b]/[0.6] max-w-64">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-[#1d2025]">
                <Coins size={24} className="text-[#d4d4d4]" />
              </div>
              <div>
                <Profile username={username} />
              </div>
            </div>
          </div>

          <div className="mt-12 text-5xl font-bold flex items-center">
            <img src={storge} width={44} height={44} alt="storage" />
            <span className="ml-2">{points.toLocaleString()}</span>
          </div>

          <div className='mt-4 flex items-center space-x-5'>
            <p className="text-sm"><a target="_blank" href="https://t.me/storgecoin">Join Storges Community <Arrow size={18} className="ml-0 mb-1 inline-block" /></a></p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full px-4 pb-4 z-10">
          <div className="w-full flex justify-between gap-2">
            <div className="w-1/3 flex items-center justify-start max-w-32">
              <div className="flex items-center justify-center">
                <img src={highVoltage} width={44} height={44} alt="High Voltage" />
                <div className="ml-2 text-left">
                  <span className="text-white text-2xl font-bold block">{energy}</span>
                  <span className="text-white text-large opacity-75">/ 6500</span>
                </div>
              </div>
            </div>
            <div className="flex-grow flex items-center max-w-60 text-sm">
              <div className="w-full bg-nav py-4 rounded-2xl flex justify-around">
                <NavLink to="/quest" className="flex flex-col items-center gap-1">
                  <img src={rocket} width={24} height={24} alt="Quest" />
                  <span>Quest</span>
                </NavLink>
              </div>
            </div>
          </div>
          <div className="w-full bg-[#f9c035] rounded-full mt-4">
            <div className="bg-gradient-to-r from-[#f3c45a] to-[#fffad0] h-4 rounded-full" style={{ width: `${(energy / 6500) * 100}%` }}></div>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center">
          <div className="relative mt-4">
            <center>
              <img src={storge} width={256} height={256} alt="notcoin" className={`emage ${isWobbling ? 'wobble' : ''}`} onClick={handleClick} />
            </center>
            <div className="flex items-center w-3/3">
              <div className="w-full">
                <div className="flex justify-between">
                  <div className="text-base mt-2 flex items-center">
                    <img src={trophy} width={24} height={24} alt="Trophy" />
                    <span className="ml-1">{levelNames[levelIndex]}</span>
                  </div>
                  <p className="text-sm mt-3">{levelIndex + 1} <span className="text-[#95908a]">/ {levelNames.length}</span></p>
                </div>

                <div className="flex items-center mt-1 border-2 border-[#43433b] rounded-full">
                  <div className="w-full h-2 bg-[#43433b]/[0.6] rounded-full">
                    <div className="progress-gradient h-2 rounded-full" style={{ width: `${calculateProgress()}%` }}></div>
                  </div>
                </div>

                <div className="boost-buttons mt-4">
                  <button
                    className="boost-button"
                    onClick={() => activateBoost(2, 30000)}
                    disabled={boostClicks.x2 <= 0}
                  >
                    x2 ({boostClicks.x2} left)
                  </button>
                  <button
                    className="boost-button"
                    onClick={() => activateBoost(3, 15000)}
                    disabled={boostClicks.x3 <= 0}
                  >
                    x3 ({boostClicks.x3} left)
                  </button>
                </div>
                {boostTimeout !== null && (
                  <div className="boost-timeout mt-4 text-xl font-bold">
                    Boost active! Time remaining: {boostTimeout}s
                  </div>
                )}
              </div>
            </div>
            {clicks.map((click) => (
              <div
                key={click.id}
                className="absolute text-5xl font-bold opacity-0"
                style={{
                  top: `${click.y - 42}px`,
                  left: `${click.x - 28}px`,
                  animation: `float 1s ease-out`
                }}
                onAnimationEnd={() => handleAnimationEnd(click.id)}
              >
                +{click.points}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
