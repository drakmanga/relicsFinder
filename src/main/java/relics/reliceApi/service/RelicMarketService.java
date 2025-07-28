package relics.reliceApi.service;

import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.http.HttpClient;

import org.json.JSONArray;
import org.json.JSONObject;

@Service
public class RelicMarketService {

    private static final HttpClient httpClient = HttpClient.newHttpClient();

    public double getAveragePrice(String relicName) {
        try {
            String formatted = relicName.trim().toLowerCase().replace(" ", "_") + "_relic";
            String urlStr = "https://api.warframe.market/v1/items/" + formatted + "/statistics";

            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("accept", "application/json");
            conn.setRequestProperty("platform", "pc");

            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            String inputLine;
            StringBuilder json = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                json.append(inputLine);
            }
            in.close();

            JSONObject root = new JSONObject(json.toString());
            JSONArray stats = root.getJSONObject("payload")
                    .getJSONObject("statistics_live")
                    .getJSONArray("48hours");

            // Media dei "avg_price" sulle ultime 48 ore
            double sum = 0;
            int count = 0;

            for (int i = 0; i < stats.length(); i++) {
                JSONObject entry = stats.getJSONObject(i);
                if (entry.has("avg_price")) {
                    sum += entry.getDouble("avg_price");
                    count++;
                }
            }

            return count > 0 ? (double) Math.round((sum / count) * 100) /100 : -1;

        } catch (Exception e) {
            System.err.println("Errore durante richiesta al market: " + e.getMessage());
            return -1;
        }
    }
}

