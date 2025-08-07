package relics.reliceApi.service;

import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.DropInfoRelic;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import java.util.ArrayList;
import java.util.List;

@Service
public class RelicDropInfoService {


    public List<DropInfoRelic> getRelicDropInfo(String relicName) {
        List<DropInfoRelic> dropList = new ArrayList<>();

        try {
            String formatted = relicName.trim().replace(" ", "_");
            String url = "https://warframe.fandom.com/wiki/" + formatted;

            Document doc = Jsoup.connect(url).userAgent("Mozilla").get();
            Elements tables = doc.select("table.wikitable");

            for (Element table : tables) {
                if (table.text().contains("Mission") && table.text().contains("Rotation")) {
                    Elements rows = table.select("tr");

                    for (Element row : rows) {
                        Elements cols = row.select("td");
                        if (cols.size() >= 3) {
                            String mission = cols.get(0).text();
                            String rotation = cols.get(2).text();
                            String chance = cols.get(3).text();
                            String location = cols.get(4).text();
                            dropList.add(new DropInfoRelic(mission, location, rotation, chance));
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Log e.g. URL not found
            System.out.println("Errore: " + e.getMessage());
        }

        return dropList;
    }
}
