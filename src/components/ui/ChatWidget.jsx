import { useState, useRef, useEffect } from 'react';
import { FaFacebookMessenger } from 'react-icons/fa6';
import { X, Send, MessageCircle } from 'lucide-react';
import './ChatWidget.css';

const BOT_NAME = 'Elusive Racing';

function getResponse(input) {
  const msg = input.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|sup|yo|g'day)\b/.test(msg)) {
    return "G'day! Welcome to Elusive Racing 👋 I can help with products, brands, shipping, store hours and more. What are you looking for?";
  }

  // Hours
  if (/hour|open|close|trading|when/.test(msg)) {
    return "We're open:\n• Mon – Fri: 9:00 AM – 5:00 PM\n• Saturday: 9:00 AM – 2:00 PM\n• Sunday: Closed";
  }

  // Location / address
  if (/location|address|where|store|visit|clayton/.test(msg)) {
    return "We're located at 1/32 Graham Road, Clayton South VIC 3169. Drop in during trading hours or give us a call first on 03 9574 1710.";
  }

  // Phone / contact
  if (/phone|call|number|contact|reach|email/.test(msg)) {
    return "You can reach us at:\n• Phone: 03 9574 1710\n• Email: sales@elusiveracing.com.au\n• Facebook Messenger: m.me/ElusiveRacin";
  }

  // Shipping
  if (/ship|deliver|postage|freight|dispatch/.test(msg)) {
    return "We offer free shipping on orders over $150 AUD within Australia. International shipping is also available. Orders are typically dispatched within 1–2 business days.";
  }

  // Returns
  if (/return|refund|exchange|warranty/.test(msg)) {
    return "We have a returns policy in place for faulty or incorrectly sent items. Please contact us at sales@elusiveracing.com.au within 14 days of receiving your order.";
  }

  // Afterpay / Zip / payment
  if (/afterpay|zip|pay later|buy now|payment|pay/.test(msg)) {
    return "We accept Visa, Mastercard, Amex, PayPal, Afterpay, Zip, Apple Pay and Google Pay. Buy now, pay later is available via Afterpay and Zip.";
  }

  // Wholesale
  if (/wholesale|trade|reseller|bulk/.test(msg)) {
    return "We offer wholesale accounts for trade customers. You can register at /wholesale-registration or login at /wholesale-login. Contact us for more info.";
  }

  // Brands
  if (/brand|make|manufacturer|who do you stock/.test(msg)) {
    return "We stock 150+ brands including K-Tuned, Skunk2, Hondata, AEM, BC Racing, HKS, Exedy, ARP, ACL, Mugen, Spoon, Project Mu, Cusco, NGK, Bosch, and many more. Check out /brands for the full list.";
  }

  // Engine parts
  if (/engine|internals|piston|cam|bearing|connecting rod|crank|valvetrain/.test(msg)) {
    return "We stock a wide range of engine parts including pistons, camshafts, bearings, connecting rods, crankshafts and valvetrain components. Browse /category/engine to see everything.";
  }

  // Induction
  if (/intake|induction|air filter|cold air|throttle|manifold/.test(msg)) {
    return "Our induction range includes air filters, cold air intakes, throttle bodies and intake manifolds from brands like AEM and Skunk2. See /category/engine/induction.";
  }

  // Turbo / forced induction
  if (/turbo|supercharg|intercooler|blow off|bov|boost/.test(msg)) {
    return "We carry turbochargers, superchargers, intercoolers and blow off valves from top brands like HKS. Browse /category/engine/forced-induction.";
  }

  // Fuel system
  if (/fuel|injector|fuel pump|fuel rail|regulator/.test(msg)) {
    return "Our fuel system range includes injectors, fuel rails, pumps and pressure regulators. See /category/engine/fuel-system.";
  }

  // Clutch / drivetrain
  if (/clutch|flywheel|drivetrain|driveshaft|half shaft|gearbox|synchro|lsd|differential/.test(msg)) {
    return "We stock clutch kits, flywheels, driveshafts, LSD units, gearbox synchros and more from brands like Exedy and K-Tuned. Browse /category/drivetrain.";
  }

  // Suspension
  if (/suspension|coilover|spring|sway bar|control arm|bushing|strut|camber/.test(msg)) {
    return "Our suspension range includes coilovers, springs, sway bars, control arms and camber kits from BC Racing, Cusco and more. See /category/suspension.";
  }

  // Brakes
  if (/brake|pad|rotor|caliper|brake line|brake fluid/.test(msg)) {
    return "We carry brake pads, rotors, kits, lines and fluid from brands like Project Mu. Browse /category/brakes.";
  }

  // Electronics / ECU
  if (/ecu|hondata|electronics|wideband|boost controller|sensor|gauge|wiring/.test(msg)) {
    return "We stock engine management systems, Hondata products, wideband sensors, boost controllers and more. See /category/electronics.";
  }

  // Cooling
  if (/cool|radiator|thermostat|water pump|oil cooler|coolant/.test(msg)) {
    return "Our cooling range covers radiators, hoses, thermostats, water pumps, oil coolers and coolant. Browse /category/cooling.";
  }

  // Exterior
  if (/exterior|body kit|lip|skirt|diffuser|wing|spoiler|hood|mirror/.test(msg)) {
    return "We stock body kits, front lips, side skirts, rear diffusers, wings and more. Browse /category/exterior.";
  }

  // Interior
  if (/interior|seat|steering wheel|shift knob|harness|roll cage|pedal/.test(msg)) {
    return "Our interior range includes seats, steering wheels, shift knobs, harnesses and roll cages. See /category/interior.";
  }

  // Honda OEM
  if (/oem|genuine|honda oem|stock/.test(msg)) {
    return "We carry a large range of Honda OEM parts covering engine, drivetrain and body. Browse /category/honda-oem.";
  }

  // Specific brand queries
  if (/k.?tuned/.test(msg)) return "K-Tuned is one of our most popular brands — great for Honda/Acura performance builds. View their range at /brand/k-tuned.";
  if (/skunk2/.test(msg)) return "Skunk2 is a staple for Honda builds. We stock cam gears, intakes, suspension and more. See /brand/skunk2.";
  if (/hondata/.test(msg)) return "We're an authorised Hondata dealer. FlashPro, KPro and S300 available. See /brand/hondata.";
  if (/bc racing/.test(msg)) return "BC Racing coilovers are very popular — great quality at a great price. See /brand/bc-racing.";
  if (/hks/.test(msg)) return "We stock a wide range of HKS products including blow off valves, exhausts and more. See /brand/hks.";
  if (/exedy/.test(msg)) return "Exedy clutch kits are our best sellers for Honda builds. See /brand/exedy.";

  // Merchandise
  if (/merch|apparel|shirt|hoodie|sticker|hat|clothing/.test(msg)) {
    return "We sell Elusive Racing merchandise including apparel, accessories and stickers. Browse /category/merchandise.";
  }

  // Clearance / sale
  if (/clearance|sale|discount|deal|cheap/.test(msg)) {
    return "Check out our clearance section for discounted parts at /category/clearance.";
  }

  // Thanks
  if (/thank|thanks|cheers|appreciate/.test(msg)) {
    return "No worries! Let us know if there's anything else we can help with 🙌";
  }

  // Fallback
  return "I'm not sure about that one — for specific part enquiries, give us a call on 03 9574 1710 or email sales@elusiveracing.com.au and our team will sort you out.";
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "G'day! I'm the Elusive Racing assistant. Ask me about products, brands, shipping or store info." },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: getResponse(text) }]);
    }, 700);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={`chat-widget${open ? ' chat-widget--open' : ''}`}>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">ER</div>
              <div>
                <div className="chat-header-name">{BOT_NAME}</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  Online
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.from}`}>
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}
            {typing && (
              <div className="chat-msg chat-msg--bot">
                <div className="chat-bubble chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className="chat-send" onClick={send} aria-label="Send" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Open chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
